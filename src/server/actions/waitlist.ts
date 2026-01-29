"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotification } from "./notifications";
import { sendEmail, waitlistSpotAvailableEmail } from "@/lib/email";

// ==================== SCHEMAS ====================

const joinWaitlistSchema = z.object({
  daycareId: z.string().min(1),
  parentName: z.string().min(1, "Name is required"),
  parentEmail: z.string().email("Valid email is required"),
  parentPhone: z.string().optional(),
  childAge: z.number().min(0, "Age must be positive").max(144, "Age must be under 12 years"),
  desiredStart: z.string().min(1, "Desired start date is required"),
  notes: z.string().max(500).optional(),
});

const updateWaitlistEntrySchema = z.object({
  id: z.string().min(1),
  position: z.number().min(1).optional(),
  notes: z.string().max(500).optional(),
});

// ==================== PUBLIC ACTIONS ====================

export async function joinWaitlist(data: z.infer<typeof joinWaitlistSchema>) {
  try {
    const validated = joinWaitlistSchema.parse(data);

    // Check if daycare exists
    const daycare = await db.daycare.findUnique({
      where: { id: validated.daycareId },
      select: { id: true, name: true, capacity: true },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    // Check if already on waitlist
    const existing = await db.waitlistEntry.findFirst({
      where: {
        daycareId: validated.daycareId,
        parentEmail: validated.parentEmail,
        notifiedAt: null, // Only check active entries
      },
    });

    if (existing) {
      return { success: false, error: "You are already on the waitlist for this daycare" };
    }

    // Get next position
    const lastEntry = await db.waitlistEntry.findFirst({
      where: { daycareId: validated.daycareId, notifiedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = (lastEntry?.position || 0) + 1;

    // Create entry
    const entry = await db.waitlistEntry.create({
      data: {
        daycareId: validated.daycareId,
        parentName: validated.parentName,
        parentEmail: validated.parentEmail,
        parentPhone: validated.parentPhone || null,
        childAge: validated.childAge,
        desiredStart: new Date(validated.desiredStart),
        notes: validated.notes || null,
        position,
      },
    });

    revalidatePath(`/daycare/${validated.daycareId}`);

    return { success: true, data: { position: entry.position } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("[Waitlist] Join error:", error);
    return { success: false, error: "Failed to join waitlist" };
  }
}

export async function getWaitlistPosition(daycareId: string, email: string) {
  const entry = await db.waitlistEntry.findFirst({
    where: {
      daycareId,
      parentEmail: email,
      notifiedAt: null,
    },
    select: {
      id: true,
      position: true,
      createdAt: true,
      daycare: {
        select: { name: true, slug: true },
      },
    },
  });

  return entry;
}

export async function getMyWaitlistEntries() {
  const session = await auth();
  if (!session?.user?.email) return [];

  const entries = await db.waitlistEntry.findMany({
    where: {
      parentEmail: session.user.email,
      notifiedAt: null,
    },
    include: {
      daycare: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return entries;
}

export async function leaveWaitlist(daycareId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const entry = await db.waitlistEntry.findFirst({
      where: {
        daycareId,
        parentEmail: session.user.email,
        notifiedAt: null,
      },
    });

    if (!entry) {
      return { success: false, error: "Waitlist entry not found" };
    }

    // Delete entry
    await db.waitlistEntry.delete({
      where: { id: entry.id },
    });

    // Reorder remaining entries
    await db.$executeRaw`
      UPDATE "WaitlistEntry"
      SET position = position - 1
      WHERE "daycareId" = ${daycareId}
        AND position > ${entry.position}
        AND "notifiedAt" IS NULL
    `;

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[Waitlist] Leave error:", error);
    return { success: false, error: "Failed to leave waitlist" };
  }
}

// ==================== PORTAL ACTIONS (DAYCARE OWNERS) ====================

export async function getWaitlistForDaycare() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const staff = await db.daycareStaff.findFirst({
    where: { userId: session.user.id, role: { in: ["owner", "manager"] } },
    select: { daycareId: true },
  });

  if (!staff) return null;

  const entries = await db.waitlistEntry.findMany({
    where: { daycareId: staff.daycareId },
    orderBy: [{ notifiedAt: "asc" }, { position: "asc" }],
  });

  const activeCount = entries.filter((e) => !e.notifiedAt).length;
  const notifiedCount = entries.filter((e) => e.notifiedAt).length;

  return {
    entries,
    stats: {
      active: activeCount,
      notified: notifiedCount,
      total: entries.length,
    },
  };
}

export async function updateWaitlistEntry(data: z.infer<typeof updateWaitlistEntrySchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const validated = updateWaitlistEntrySchema.parse(data);

    // Verify ownership
    const entry = await db.waitlistEntry.findUnique({
      where: { id: validated.id },
      include: {
        daycare: {
          include: {
            staff: { where: { userId: session.user.id, role: { in: ["owner", "manager"] } } },
          },
        },
      },
    });

    if (!entry || entry.daycare.staff.length === 0) {
      return { success: false, error: "Entry not found or access denied" };
    }

    // Update position if changed
    if (validated.position && validated.position !== entry.position) {
      const oldPosition = entry.position;
      const newPosition = validated.position;

      if (newPosition > oldPosition) {
        // Moving down: shift entries up
        await db.$executeRaw`
          UPDATE "WaitlistEntry"
          SET position = position - 1
          WHERE "daycareId" = ${entry.daycareId}
            AND position > ${oldPosition}
            AND position <= ${newPosition}
            AND "notifiedAt" IS NULL
        `;
      } else {
        // Moving up: shift entries down
        await db.$executeRaw`
          UPDATE "WaitlistEntry"
          SET position = position + 1
          WHERE "daycareId" = ${entry.daycareId}
            AND position >= ${newPosition}
            AND position < ${oldPosition}
            AND "notifiedAt" IS NULL
        `;
      }
    }

    await db.waitlistEntry.update({
      where: { id: validated.id },
      data: {
        position: validated.position ?? entry.position,
        notes: validated.notes !== undefined ? validated.notes : entry.notes,
      },
    });

    revalidatePath("/portal/waitlist");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("[Waitlist] Update error:", error);
    return { success: false, error: "Failed to update entry" };
  }
}

export async function removeFromWaitlist(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify ownership
    const entry = await db.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        daycare: {
          include: {
            staff: { where: { userId: session.user.id, role: { in: ["owner", "manager"] } } },
          },
        },
      },
    });

    if (!entry || entry.daycare.staff.length === 0) {
      return { success: false, error: "Entry not found or access denied" };
    }

    await db.waitlistEntry.delete({ where: { id: entryId } });

    // Reorder remaining entries
    await db.$executeRaw`
      UPDATE "WaitlistEntry"
      SET position = position - 1
      WHERE "daycareId" = ${entry.daycareId}
        AND position > ${entry.position}
        AND "notifiedAt" IS NULL
    `;

    revalidatePath("/portal/waitlist");

    return { success: true };
  } catch (error) {
    console.error("[Waitlist] Remove error:", error);
    return { success: false, error: "Failed to remove entry" };
  }
}

export async function notifyWaitlistEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify ownership
    const entry = await db.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        daycare: {
          include: {
            staff: { where: { userId: session.user.id, role: { in: ["owner", "manager"] } } },
          },
        },
      },
    });

    if (!entry || entry.daycare.staff.length === 0) {
      return { success: false, error: "Entry not found or access denied" };
    }

    if (entry.notifiedAt) {
      return { success: false, error: "Entry already notified" };
    }

    // Mark as notified
    await db.waitlistEntry.update({
      where: { id: entryId },
      data: { notifiedAt: new Date() },
    });

    // Send email notification
    await sendEmail({
      to: entry.parentEmail,
      subject: `Spot Available at ${entry.daycare.name}!`,
      html: waitlistSpotAvailableEmail(
        entry.parentName,
        entry.daycare.name,
        entry.daycare.slug
      ),
    });

    // Also create in-app notification if user exists
    const user = await db.user.findUnique({
      where: { email: entry.parentEmail },
      select: { id: true },
    });

    if (user) {
      await createNotification({
        userId: user.id,
        type: "waitlist_spot_available",
        title: "Spot Available!",
        body: `A spot is now available at ${entry.daycare.name}. Contact them soon to secure your spot!`,
        data: {
          daycareId: entry.daycareId,
          daycareSlug: entry.daycare.slug,
        },
      });
    }

    // Reorder remaining entries
    await db.$executeRaw`
      UPDATE "WaitlistEntry"
      SET position = position - 1
      WHERE "daycareId" = ${entry.daycareId}
        AND position > ${entry.position}
        AND "notifiedAt" IS NULL
    `;

    revalidatePath("/portal/waitlist");

    return { success: true };
  } catch (error) {
    console.error("[Waitlist] Notify error:", error);
    return { success: false, error: "Failed to notify entry" };
  }
}

// ==================== HELPER: CHECK IF DAYCARE IS FULL ====================

export async function isDaycareFull(daycareId: string) {
  const daycare = await db.daycare.findUnique({
    where: { id: daycareId },
    select: { capacity: true },
  });

  if (!daycare) return { isFull: false, capacity: 0, enrolled: 0, spotsAvailable: 0 };

  const enrolledCount = await db.enrollment.count({
    where: {
      daycareId,
      status: "active",
    },
  });

  return {
    isFull: enrolledCount >= daycare.capacity,
    capacity: daycare.capacity,
    enrolled: enrolledCount,
    spotsAvailable: Math.max(0, daycare.capacity - enrolledCount),
  };
}
