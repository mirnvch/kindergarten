"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotification } from "./notifications";
import { sendEmail, waitlistSpotAvailableEmail } from "@/lib/email";

// ==================== SCHEMAS ====================

const joinWaitlistSchema = z.object({
  providerId: z.string().min(1),
  patientName: z.string().min(1, "Name is required"),
  patientEmail: z.string().email("Valid email is required"),
  patientPhone: z.string().optional(),
  desiredDate: z.string().min(1, "Desired appointment date is required"),
  reasonForVisit: z.string().max(500).optional(),
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

    // Rate limit by email: 10 waitlist joins per hour
    const rateLimitResult = await rateLimit(validated.patientEmail, "waitlist");
    if (!rateLimitResult.success) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    // Check if provider exists
    const provider = await db.provider.findUnique({
      where: { id: validated.providerId },
      select: { id: true, name: true, acceptingNewPatients: true },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    // Check if already on waitlist
    const existing = await db.waitlistEntry.findFirst({
      where: {
        providerId: validated.providerId,
        patientEmail: validated.patientEmail,
        notifiedAt: null, // Only check active entries
      },
    });

    if (existing) {
      return { success: false, error: "You are already on the waitlist for this provider" };
    }

    // Get next position
    const lastEntry = await db.waitlistEntry.findFirst({
      where: { providerId: validated.providerId, notifiedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = (lastEntry?.position || 0) + 1;

    // Create entry
    const entry = await db.waitlistEntry.create({
      data: {
        providerId: validated.providerId,
        patientName: validated.patientName,
        patientEmail: validated.patientEmail,
        patientPhone: validated.patientPhone || null,
        desiredDate: new Date(validated.desiredDate),
        reasonForVisit: validated.reasonForVisit || null,
        notes: validated.notes || null,
        position,
      },
    });

    revalidatePath(`/provider/${validated.providerId}`);

    return { success: true, data: { position: entry.position } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("[Waitlist] Join error:", error);
    return { success: false, error: "Failed to join waitlist" };
  }
}

export async function getWaitlistPosition(providerId: string, email: string) {
  const entry = await db.waitlistEntry.findFirst({
    where: {
      providerId,
      patientEmail: email,
      notifiedAt: null,
    },
    select: {
      id: true,
      position: true,
      createdAt: true,
      provider: {
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
      patientEmail: session.user.email,
      notifiedAt: null,
    },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          specialty: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return entries;
}

export async function leaveWaitlist(providerId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const entry = await db.waitlistEntry.findFirst({
      where: {
        providerId,
        patientEmail: session.user.email,
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
      WHERE "providerId" = ${providerId}
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

// ==================== PORTAL ACTIONS (PROVIDER OWNERS) ====================

export async function getWaitlistForProvider() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const staff = await db.providerStaff.findFirst({
    where: { userId: session.user.id, role: { in: ["owner", "manager"] } },
    select: { providerId: true },
  });

  if (!staff) return null;

  const entries = await db.waitlistEntry.findMany({
    where: { providerId: staff.providerId },
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
        provider: {
          include: {
            staff: { where: { userId: session.user.id, role: { in: ["owner", "manager"] } } },
          },
        },
      },
    });

    if (!entry || entry.provider.staff.length === 0) {
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
          WHERE "providerId" = ${entry.providerId}
            AND position > ${oldPosition}
            AND position <= ${newPosition}
            AND "notifiedAt" IS NULL
        `;
      } else {
        // Moving up: shift entries down
        await db.$executeRaw`
          UPDATE "WaitlistEntry"
          SET position = position + 1
          WHERE "providerId" = ${entry.providerId}
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
        provider: {
          include: {
            staff: { where: { userId: session.user.id, role: { in: ["owner", "manager"] } } },
          },
        },
      },
    });

    if (!entry || entry.provider.staff.length === 0) {
      return { success: false, error: "Entry not found or access denied" };
    }

    await db.waitlistEntry.delete({ where: { id: entryId } });

    // Reorder remaining entries
    await db.$executeRaw`
      UPDATE "WaitlistEntry"
      SET position = position - 1
      WHERE "providerId" = ${entry.providerId}
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
        provider: {
          include: {
            staff: { where: { userId: session.user.id, role: { in: ["owner", "manager"] } } },
          },
        },
      },
    });

    if (!entry || entry.provider.staff.length === 0) {
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
      to: entry.patientEmail,
      subject: `Appointment Available at ${entry.provider.name}!`,
      html: waitlistSpotAvailableEmail(
        entry.patientName,
        entry.provider.name,
        entry.provider.slug
      ),
    });

    // Also create in-app notification if user exists
    const user = await db.user.findUnique({
      where: { email: entry.patientEmail },
      select: { id: true },
    });

    if (user) {
      await createNotification({
        userId: user.id,
        type: "waitlist_spot_available",
        title: "Appointment Slot Available!",
        body: `An appointment slot is now available with ${entry.provider.name}. Book your appointment soon!`,
        data: {
          providerId: entry.providerId,
          providerSlug: entry.provider.slug,
        },
      });
    }

    // Reorder remaining entries
    await db.$executeRaw`
      UPDATE "WaitlistEntry"
      SET position = position - 1
      WHERE "providerId" = ${entry.providerId}
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

// ==================== HELPER: CHECK PROVIDER AVAILABILITY ====================

export async function getProviderAvailability(providerId: string) {
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: {
      acceptingNewPatients: true,
      averageWaitDays: true,
    },
  });

  if (!provider) {
    return { acceptingNewPatients: false, averageWaitDays: null };
  }

  return {
    acceptingNewPatients: provider.acceptingNewPatients,
    averageWaitDays: provider.averageWaitDays,
  };
}

// ==================== LEGACY CAPACITY CHECK (for daycare model compatibility) ====================

/**
 * Check if a provider/daycare is at full capacity
 * Used by daycare detail pages to show waitlist form
 */
export async function isDaycareFull(daycareId: string) {
  // For providers model, we use acceptingNewPatients flag
  // This function maintains compatibility with old daycare pages
  const provider = await db.provider.findUnique({
    where: { id: daycareId },
    select: {
      acceptingNewPatients: true,
      // Provider model doesn't have capacity fields by default
      // Return defaults for compatibility
    },
  });

  if (!provider) {
    return {
      isFull: true,
      capacity: 0,
      enrolled: 0,
      spotsAvailable: 0,
    };
  }

  // For medical providers, isFull means not accepting new patients
  return {
    isFull: !provider.acceptingNewPatients,
    capacity: 100, // Placeholder for compatibility
    enrolled: provider.acceptingNewPatients ? 50 : 100, // Placeholder
    spotsAvailable: provider.acceptingNewPatients ? 50 : 0, // Placeholder
  };
}

// Alias for provider availability
export const isProviderFull = isDaycareFull;

// ==================== LEGACY ALIASES ====================

// Legacy alias for backward compatibility
export const getWaitlistForDaycare = getWaitlistForProvider;
