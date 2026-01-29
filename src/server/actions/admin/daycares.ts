"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DaycareStatus } from "@prisma/client";

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

    const daycare = await db.daycare.findUnique({
      where: { id: daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    if (daycare.status === DaycareStatus.APPROVED) {
      return { success: false, error: "Daycare is already approved" };
    }

    await db.daycare.update({
      where: { id: daycareId },
      data: { status: DaycareStatus.APPROVED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_APPROVED",
        entityType: "Daycare",
        entityId: daycareId,
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

    const daycare = await db.daycare.findUnique({
      where: { id: daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    await db.daycare.update({
      where: { id: daycareId },
      data: { status: DaycareStatus.REJECTED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_REJECTED",
        entityType: "Daycare",
        entityId: daycareId,
        newData: { status: DaycareStatus.REJECTED, reason },
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

    const daycare = await db.daycare.findUnique({
      where: { id: daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    if (daycare.status === DaycareStatus.SUSPENDED) {
      return { success: false, error: "Daycare is already suspended" };
    }

    const oldStatus = daycare.status;

    await db.daycare.update({
      where: { id: daycareId },
      data: { status: DaycareStatus.SUSPENDED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_SUSPENDED",
        entityType: "Daycare",
        entityId: daycareId,
        oldData: { status: oldStatus },
        newData: { status: DaycareStatus.SUSPENDED, reason },
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

    const daycare = await db.daycare.findUnique({
      where: { id: daycareId },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    if (daycare.status !== DaycareStatus.SUSPENDED && daycare.status !== DaycareStatus.REJECTED) {
      return { success: false, error: "Daycare is not suspended or rejected" };
    }

    const oldStatus = daycare.status;

    await db.daycare.update({
      where: { id: daycareId },
      data: { status: DaycareStatus.APPROVED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_REACTIVATED",
        entityType: "Daycare",
        entityId: daycareId,
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

    const daycare = await db.daycare.findUnique({
      where: { id: daycareId },
      select: { id: true, name: true, email: true },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    await db.daycare.delete({
      where: { id: daycareId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "DAYCARE_DELETED",
        entityType: "Daycare",
        entityId: daycareId,
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

    const daycare = await db.daycare.findUnique({
      where: { id: daycareId },
      select: { id: true, isFeatured: true },
    });

    if (!daycare) {
      return { success: false, error: "Daycare not found" };
    }

    const newFeatured = !daycare.isFeatured;

    await db.daycare.update({
      where: { id: daycareId },
      data: { isFeatured: newFeatured },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: newFeatured ? "DAYCARE_FEATURED" : "DAYCARE_UNFEATURED",
        entityType: "Daycare",
        entityId: daycareId,
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
