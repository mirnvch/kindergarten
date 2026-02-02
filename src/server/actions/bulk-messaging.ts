"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotification } from "./notifications";

const bulkMessageSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100),
  content: z.string().min(1, "Message is required").max(2000),
  recipientType: z.enum(["all", "enrolled", "waitlisted", "toured"]),
});

type BulkMessageInput = z.infer<typeof bulkMessageSchema>;

// Check if user has premium access for bulk messaging
async function checkPremiumAccess(userId: string) {
  const staff = await db.providerStaff.findFirst({
    where: { userId, role: { in: ["owner", "manager"] } },
    include: {
      daycare: {
        include: { subscription: true },
      },
    },
  });

  if (!staff) return null;

  const plan = staff.daycare.subscription?.plan;
  const isActive = staff.daycare.subscription?.status === "ACTIVE";

  // Bulk messaging available for PROFESSIONAL and ENTERPRISE
  const hasBulkMessaging = isActive && (plan === "PROFESSIONAL" || plan === "ENTERPRISE");

  return {
    daycare: staff.daycare,
    hasBulkMessaging,
    plan,
  };
}

export async function sendBulkMessage(data: BulkMessageInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Rate limit: 3 bulk messages per hour per user
  const rateLimitResult = await rateLimit(session.user.id, "bulk-message");
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many bulk messages. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
    };
  }

  const access = await checkPremiumAccess(session.user.id);
  if (!access) {
    return { success: false, error: "Daycare not found" };
  }

  if (!access.hasBulkMessaging) {
    return { success: false, error: "Bulk messaging requires Professional or Enterprise plan" };
  }

  try {
    const validated = bulkMessageSchema.parse(data);
    const daycare = access.daycare;

    // Get recipients based on type
    let recipients: { id: string; userId: string }[] = [];

    switch (validated.recipientType) {
      case "all":
        // All parents who have interacted with the daycare
        const threads = await db.messageThread.findMany({
          where: { providerId: daycare.id },
          select: { patientId: true },
          distinct: ["patientId"],
        });
        recipients = threads.map((t) => ({ id: t.patientId, userId: t.patientId }));
        break;

      case "enrolled":
        // Parents with active enrollments
        const enrollments = await db.appointment.findMany({
          where: { providerId: daycare.id, status: "ACTIVE" },
          select: { child: { select: { patientId: true } } },
        });
        const enrolledParents = [...new Set(enrollments.map((e) => e.child.patientId))];
        recipients = enrolledParents.map((id) => ({ id, userId: id }));
        break;

      case "waitlisted":
        // Waitlist entries - find matching users by email
        const waitlist = await db.waitlistEntry.findMany({
          where: { providerId: daycare.id, notifiedAt: null },
          select: { parentEmail: true },
        });
        const waitlistEmails = waitlist.map((w) => w.parentEmail);
        const waitlistUsers = await db.user.findMany({
          where: { email: { in: waitlistEmails } },
          select: { id: true },
        });
        recipients = waitlistUsers.map((u) => ({ id: u.id, userId: u.id }));
        break;

      case "toured":
        // Parents who completed tours
        const tours = await db.appointment.findMany({
          where: { providerId: daycare.id, type: "TOUR", status: "COMPLETED" },
          select: { patientId: true },
          distinct: ["patientId"],
        });
        recipients = tours.map((t) => ({ id: t.patientId, userId: t.patientId }));
        break;
    }

    if (recipients.length === 0) {
      return { success: false, error: "No recipients found for the selected group" };
    }

    // OPTIMIZED: Batch operations instead of N+1 queries
    const recipientUserIds = recipients.map((r) => r.userId);

    // 1. Pre-fetch ALL existing threads in one query
    const existingThreads = await db.messageThread.findMany({
      where: {
        providerId: daycare.id,
        patientId: { in: recipientUserIds },
      },
      select: { id: true, patientId: true },
    });

    const threadsByParent = new Map(existingThreads.map((t) => [t.patientId, t.id]));

    // 2. Find recipients without threads
    const recipientsWithoutThreads = recipientUserIds.filter(
      (userId) => !threadsByParent.has(userId)
    );

    // 3. Create missing threads in batch using transaction
    let sent = 0;
    let failed = 0;

    try {
      await db.$transaction(async (tx) => {
        // Create missing threads
        if (recipientsWithoutThreads.length > 0) {
          await tx.messageThread.createMany({
            data: recipientsWithoutThreads.map((patientId) => ({
              providerId: daycare.id,
              patientId,
              subject: validated.subject,
            })),
            skipDuplicates: true,
          });

          // Fetch newly created threads
          const newThreads = await tx.messageThread.findMany({
            where: {
              providerId: daycare.id,
              patientId: { in: recipientsWithoutThreads },
            },
            select: { id: true, patientId: true },
          });

          newThreads.forEach((t) => threadsByParent.set(t.patientId, t.id));
        }

        // 4. Create all messages in batch
        const messagesData = recipientUserIds
          .map((userId) => {
            const threadId = threadsByParent.get(userId);
            if (!threadId) return null;
            return {
              threadId,
              senderId: session.user!.id,
              content: `**${validated.subject}**\n\n${validated.content}`,
              isBulk: true,
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== null);

        await tx.message.createMany({ data: messagesData });

        // 5. Create all notifications in batch
        const notificationsData = recipientUserIds
          .map((userId) => {
            const threadId = threadsByParent.get(userId);
            if (!threadId) return null;
            return {
              userId,
              type: "message_received",
              title: `Message from ${daycare.name}`,
              body: validated.subject,
              data: { threadId, providerId: daycare.id },
            };
          })
          .filter((n): n is NonNullable<typeof n> => n !== null);

        await tx.notification.createMany({ data: notificationsData });

        // 6. Update thread lastMessageAt in batch
        await tx.messageThread.updateMany({
          where: { id: { in: Array.from(threadsByParent.values()) } },
          data: { lastMessageAt: new Date() },
        });

        sent = messagesData.length;
      });
    } catch (txError) {
      console.error("[BulkMessage] Transaction failed:", txError);
      failed = recipientUserIds.length;
    }

    revalidatePath("/portal/messages");

    return {
      success: true,
      data: { sent, failed, total: recipients.length },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("[BulkMessage] Error:", error);
    return { success: false, error: "Failed to send messages" };
  }
}

export async function getBulkMessageStats() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const access = await checkPremiumAccess(session.user.id);
  if (!access) return null;

  // Get counts for each recipient type
  const [allCount, enrolledCount, touredCount] = await Promise.all([
    db.messageThread.count({
      where: { providerId: access.daycare.id },
    }),
    db.appointment.count({
      where: { providerId: access.daycare.id, status: "ACTIVE" },
    }),
    db.appointment.groupBy({
      by: ["patientId"],
      where: { providerId: access.daycare.id, type: "TOUR", status: "COMPLETED" },
    }).then((r) => r.length),
  ]);

  // Count waitlist entries that have matching user accounts
  const waitlistEntries = await db.waitlistEntry.findMany({
    where: { providerId: access.daycare.id, notifiedAt: null },
    select: { parentEmail: true },
  });
  const waitlistEmails = waitlistEntries.map((w) => w.parentEmail);
  const waitlistedCount = await db.user.count({
    where: { email: { in: waitlistEmails } },
  });

  return {
    hasBulkMessaging: access.hasBulkMessaging,
    plan: access.plan,
    counts: {
      all: allCount,
      enrolled: enrolledCount,
      waitlisted: waitlistedCount,
      toured: touredCount,
    },
  };
}
