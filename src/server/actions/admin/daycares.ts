"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProviderStatus } from "@prisma/client";
import {
  approveProviderSchema,
  rejectProviderSchema,
  suspendProviderSchema,
  reactivateProviderSchema,
  deleteProviderSchema,
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

export async function approveProvider(providerId: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = approveProviderSchema.safeParse({ providerId });
    if (!result.success) {
      return { success: false, error: "Invalid provider ID" };
    }

    const provider = await db.provider.findUnique({
      where: { id: result.data.providerId },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    if (provider.status === ProviderStatus.APPROVED) {
      return { success: false, error: "Provider is already approved" };
    }

    await db.provider.update({
      where: { id: result.data.providerId },
      data: { status: ProviderStatus.APPROVED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "PROVIDER_APPROVED",
        entityType: "Provider",
        entityId: result.data.providerId,
        newData: { status: ProviderStatus.APPROVED },
      },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (error) {
    console.error("Error approving provider:", error);
    return { success: false, error: "Failed to approve provider" };
  }
}

// Legacy alias
export const approveDaycare = approveProvider;

export async function rejectProvider(providerId: string, reason?: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = rejectProviderSchema.safeParse({ providerId, reason });
    if (!result.success) {
      return { success: false, error: "Invalid input" };
    }

    const provider = await db.provider.findUnique({
      where: { id: result.data.providerId },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    await db.provider.update({
      where: { id: result.data.providerId },
      data: { status: ProviderStatus.REJECTED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "PROVIDER_REJECTED",
        entityType: "Provider",
        entityId: result.data.providerId,
        newData: { status: ProviderStatus.REJECTED, reason: result.data.reason },
      },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting provider:", error);
    return { success: false, error: "Failed to reject provider" };
  }
}

// Legacy alias
export const rejectDaycare = rejectProvider;

export async function suspendProvider(providerId: string, reason?: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-suspend");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = suspendProviderSchema.safeParse({ providerId, reason });
    if (!result.success) {
      return { success: false, error: "Invalid input" };
    }

    const provider = await db.provider.findUnique({
      where: { id: result.data.providerId },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    if (provider.status === ProviderStatus.SUSPENDED) {
      return { success: false, error: "Provider is already suspended" };
    }

    const oldStatus = provider.status;

    await db.provider.update({
      where: { id: result.data.providerId },
      data: { status: ProviderStatus.SUSPENDED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "PROVIDER_SUSPENDED",
        entityType: "Provider",
        entityId: result.data.providerId,
        oldData: { status: oldStatus },
        newData: { status: ProviderStatus.SUSPENDED, reason: result.data.reason },
      },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (error) {
    console.error("Error suspending provider:", error);
    return { success: false, error: "Failed to suspend provider" };
  }
}

// Legacy alias
export const suspendDaycare = suspendProvider;

export async function reactivateProvider(providerId: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = reactivateProviderSchema.safeParse({ providerId });
    if (!result.success) {
      return { success: false, error: "Invalid provider ID" };
    }

    const provider = await db.provider.findUnique({
      where: { id: result.data.providerId },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    if (provider.status !== ProviderStatus.SUSPENDED && provider.status !== ProviderStatus.REJECTED) {
      return { success: false, error: "Provider is not suspended or rejected" };
    }

    const oldStatus = provider.status;

    await db.provider.update({
      where: { id: result.data.providerId },
      data: { status: ProviderStatus.APPROVED },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "PROVIDER_REACTIVATED",
        entityType: "Provider",
        entityId: result.data.providerId,
        oldData: { status: oldStatus },
        newData: { status: ProviderStatus.APPROVED },
      },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (error) {
    console.error("Error reactivating provider:", error);
    return { success: false, error: "Failed to reactivate provider" };
  }
}

// Legacy alias
export const reactivateDaycare = reactivateProvider;

export async function deleteProvider(providerId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-delete-provider");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = deleteProviderSchema.safeParse({ providerId });
    if (!result.success) {
      return { success: false, error: "Invalid provider ID" };
    }

    const provider = await db.provider.findUnique({
      where: { id: result.data.providerId },
      select: { id: true, name: true, email: true },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    await db.provider.delete({
      where: { id: result.data.providerId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "PROVIDER_DELETED",
        entityType: "Provider",
        entityId: result.data.providerId,
        oldData: { name: provider.name, email: provider.email },
      },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting provider:", error);
    return { success: false, error: "Failed to delete provider" };
  }
}

// Legacy alias
export const deleteDaycare = deleteProvider;

export async function toggleFeatured(providerId: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const result = toggleFeaturedSchema.safeParse({ providerId });
    if (!result.success) {
      return { success: false, error: "Invalid provider ID" };
    }

    const provider = await db.provider.findUnique({
      where: { id: result.data.providerId },
      select: { id: true, isFeatured: true },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    const newFeatured = !provider.isFeatured;

    await db.provider.update({
      where: { id: result.data.providerId },
      data: { isFeatured: newFeatured },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: newFeatured ? "PROVIDER_FEATURED" : "PROVIDER_UNFEATURED",
        entityType: "Provider",
        entityId: result.data.providerId,
        newData: { isFeatured: newFeatured },
      },
    });

    revalidatePath("/admin/providers");
    return { success: true, isFeatured: newFeatured };
  } catch (error) {
    console.error("Error toggling featured:", error);
    return { success: false, error: "Failed to toggle featured status" };
  }
}
