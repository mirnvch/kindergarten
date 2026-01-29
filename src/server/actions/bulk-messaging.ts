"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
  const staff = await db.daycareStaff.findFirst({
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
          where: { daycareId: daycare.id },
          select: { parentId: true },
          distinct: ["parentId"],
        });
        recipients = threads.map((t) => ({ id: t.parentId, userId: t.parentId }));
        break;

      case "enrolled":
        // Parents with active enrollments
        const enrollments = await db.enrollment.findMany({
          where: { daycareId: daycare.id, status: "ACTIVE" },
          select: { child: { select: { parentId: true } } },
        });
        const enrolledParents = [...new Set(enrollments.map((e) => e.child.parentId))];
        recipients = enrolledParents.map((id) => ({ id, userId: id }));
        break;

      case "waitlisted":
        // Waitlist entries - find matching users by email
        const waitlist = await db.waitlistEntry.findMany({
          where: { daycareId: daycare.id, notifiedAt: null },
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
        const tours = await db.booking.findMany({
          where: { daycareId: daycare.id, type: "TOUR", status: "COMPLETED" },
          select: { parentId: true },
          distinct: ["parentId"],
        });
        recipients = tours.map((t) => ({ id: t.parentId, userId: t.parentId }));
        break;
    }

    if (recipients.length === 0) {
      return { success: false, error: "No recipients found for the selected group" };
    }

    // Create message threads and messages for each recipient
    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        // Find or create thread
        let thread = await db.messageThread.findFirst({
          where: { daycareId: daycare.id, parentId: recipient.userId },
        });

        if (!thread) {
          thread = await db.messageThread.create({
            data: {
              daycareId: daycare.id,
              parentId: recipient.userId,
              subject: validated.subject,
            },
          });
        }

        // Create message
        await db.message.create({
          data: {
            threadId: thread.id,
            senderId: session.user!.id,
            content: `**${validated.subject}**\n\n${validated.content}`,
            isBulk: true,
          },
        });

        // Create notification
        await createNotification({
          userId: recipient.userId,
          type: "message_received",
          title: `Message from ${daycare.name}`,
          body: validated.subject,
          data: { threadId: thread.id, daycareId: daycare.id },
        });
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

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
      where: { daycareId: access.daycare.id },
    }),
    db.enrollment.count({
      where: { daycareId: access.daycare.id, status: "ACTIVE" },
    }),
    db.booking.groupBy({
      by: ["parentId"],
      where: { daycareId: access.daycare.id, type: "TOUR", status: "COMPLETED" },
    }).then((r) => r.length),
  ]);

  // Count waitlist entries that have matching user accounts
  const waitlistEntries = await db.waitlistEntry.findMany({
    where: { daycareId: access.daycare.id, notifiedAt: null },
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
