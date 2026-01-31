"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  suspendUserSchema,
  deleteUserSchema,
  updateUserRoleSchema,
} from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function suspendUser(userId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-suspend");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = suspendUserSchema.safeParse({ userId });
    if (!result.success) {
      return { success: false, error: "Invalid user ID" };
    }

    const user = await db.user.findUnique({
      where: { id: result.data.userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.role === "ADMIN") {
      return { success: false, error: "Cannot suspend admin users" };
    }

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "USER_SUSPENDED",
        entityType: "User",
        entityId: result.data.userId,
        newData: { suspendedAt: new Date().toISOString() },
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error suspending user:", error);
    return { success: false, error: "Failed to suspend user" };
  }
}

export async function deleteUser(userId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-delete-user");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = deleteUserSchema.safeParse({ userId });
    if (!result.success) {
      return { success: false, error: "Invalid user ID" };
    }

    const user = await db.user.findUnique({
      where: { id: result.data.userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.role === "ADMIN") {
      return { success: false, error: "Cannot delete admin users" };
    }

    await db.user.delete({
      where: { id: result.data.userId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "USER_DELETED",
        entityType: "User",
        entityId: result.data.userId,
        oldData: { email: user.email, role: user.role },
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-moderate");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = updateUserRoleSchema.safeParse({ userId, newRole });
    if (!result.success) {
      return { success: false, error: "Invalid input" };
    }

    const existingUser = await db.user.findUnique({
      where: { id: result.data.userId },
      select: { role: true },
    });

    const user = await db.user.update({
      where: { id: result.data.userId },
      data: { role: result.data.newRole },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "USER_ROLE_UPDATED",
        entityType: "User",
        entityId: result.data.userId,
        oldData: existingUser ? { role: existingUser.role } : undefined,
        newData: { role: result.data.newRole },
      },
    });

    revalidatePath("/admin/users");
    return { success: true, user };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}
