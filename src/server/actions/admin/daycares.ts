"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DaycareStatus } from "@prisma/client";
import {
  approveDaycareSchema,
  rejectDaycareSchema,
  suspendDaycareSchema,
  reactivateDaycareSchema,
  deleteDaycareSchema,
  toggleFeaturedSchema,
} from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function approveDaycare(daycareId: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = approveDaycareSchema.safeParse({ daycareId });
    if (!result.success) {
      return { success: false, error: "Invalid daycare ID" };
    }

    const daycare = await db.daycare.findUnique({
      where: { id: result.data.daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    if (daycare.status === DaycareStatus.APPROVED) {
      return { success: false, error: "Daycare is already approved" };
    }

    await db.daycare.update({
      where: { id: result.data.daycareId },
      data: { status: DaycareStatus.APPROVED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_APPROVED",
        entityType: "Daycare",
        entityId: result.data.daycareId,
        newData: { status: DaycareStatus.APPROVED },
      },
    });

    revalidatePath("/admin/daycares");
    return { success: true };
  } catch (error) {
    console.error("Error approving daycare:", error);
    return { success: false, error: "Failed to approve daycare" };
  }
}

export async function rejectDaycare(daycareId: string, reason?: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = rejectDaycareSchema.safeParse({ daycareId, reason });
    if (!result.success) {
      return { success: false, error: "Invalid input" };
    }

    const daycare = await db.daycare.findUnique({
      where: { id: result.data.daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    await db.daycare.update({
      where: { id: result.data.daycareId },
      data: { status: DaycareStatus.REJECTED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_REJECTED",
        entityType: "Daycare",
        entityId: result.data.daycareId,
        newData: { status: DaycareStatus.REJECTED, reason: result.data.reason },
      },
    });

    revalidatePath("/admin/daycares");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting daycare:", error);
    return { success: false, error: "Failed to reject daycare" };
  }
}

export async function suspendDaycare(daycareId: string, reason?: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-suspend");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = suspendDaycareSchema.safeParse({ daycareId, reason });
    if (!result.success) {
      return { success: false, error: "Invalid input" };
    }

    const daycare = await db.daycare.findUnique({
      where: { id: result.data.daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    if (daycare.status === DaycareStatus.SUSPENDED) {
      return { success: false, error: "Daycare is already suspended" };
    }

    const oldStatus = daycare.status;

    await db.daycare.update({
      where: { id: result.data.daycareId },
      data: { status: DaycareStatus.SUSPENDED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_SUSPENDED",
        entityType: "Daycare",
        entityId: result.data.daycareId,
        oldData: { status: oldStatus },
        newData: { status: DaycareStatus.SUSPENDED, reason: result.data.reason },
      },
    });

    revalidatePath("/admin/daycares");
    return { success: true };
  } catch (error) {
    console.error("Error suspending daycare:", error);
    return { success: false, error: "Failed to suspend daycare" };
  }
}

export async function reactivateDaycare(daycareId: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = reactivateDaycareSchema.safeParse({ daycareId });
    if (!result.success) {
      return { success: false, error: "Invalid daycare ID" };
    }

    const daycare = await db.daycare.findUnique({
      where: { id: result.data.daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    if (daycare.status !== DaycareStatus.SUSPENDED && daycare.status !== DaycareStatus.REJECTED) {
      return { success: false, error: "Daycare is not suspended or rejected" };
    }

    const oldStatus = daycare.status;

    await db.daycare.update({
      where: { id: result.data.daycareId },
      data: { status: DaycareStatus.APPROVED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_REACTIVATED",
        entityType: "Daycare",
        entityId: result.data.daycareId,
        oldData: { status: oldStatus },
        newData: { status: DaycareStatus.APPROVED },
      },
    });

    revalidatePath("/admin/daycares");
    return { success: true };
  } catch (error) {
    console.error("Error reactivating daycare:", error);
    return { success: false, error: "Failed to reactivate daycare" };
  }
}

export async function deleteDaycare(daycareId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-delete-daycare");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = deleteDaycareSchema.safeParse({ daycareId });
    if (!result.success) {
      return { success: false, error: "Invalid daycare ID" };
    }

    const daycare = await db.daycare.findUnique({
      where: { id: result.data.daycareId },
      select: { id: true, name: true, email: true },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    await db.daycare.delete({
      where: { id: result.data.daycareId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_DELETED",
        entityType: "Daycare",
        entityId: result.data.daycareId,
        oldData: { name: daycare.name, email: daycare.email },
      },
    });

    revalidatePath("/admin/daycares");
    return { success: true };
  } catch (error) {
    console.error("Error deleting daycare:", error);
    return { success: false, error: "Failed to delete daycare" };
  }
}

export async function toggleFeatured(daycareId: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = toggleFeaturedSchema.safeParse({ daycareId });
    if (!result.success) {
      return { success: false, error: "Invalid daycare ID" };
    }

    const daycare = await db.daycare.findUnique({
      where: { id: result.data.daycareId },
      select: { id: true, isFeatured: true },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    const newFeatured = !daycare.isFeatured;

    await db.daycare.update({
      where: { id: result.data.daycareId },
      data: { isFeatured: newFeatured },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: newFeatured ? "DAYCARE_FEATURED" : "DAYCARE_UNFEATURED",
        entityType: "Daycare",
        entityId: result.data.daycareId,
        newData: { isFeatured: newFeatured },
      },
    });

    revalidatePath("/admin/daycares");
    return { success: true, isFeatured: newFeatured };
  } catch (error) {
    console.error("Error toggling featured:", error);
    return { success: false, error: "Failed to toggle featured status" };
  }
}
