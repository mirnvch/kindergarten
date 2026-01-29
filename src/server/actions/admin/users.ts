"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function suspendUser(userId: string) {
  try {
    await requireAdmin();

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.role === "ADMIN") {
      return { success: false, error: "Cannot suspend admin users" };
    }

    // For now, we'll just add a note. In production, you'd have a suspended field
    // or use a status enum on the user model
    await db.auditLog.create({
      data: {
        action: "USER_SUSPENDED",
        entityType: "User",
        entityId: userId,
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
    await requireAdmin();

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.role === "ADMIN") {
      return { success: false, error: "Cannot delete admin users" };
    }

    // Delete user and all related data
    await db.user.delete({
      where: { id: userId },
    });

    await db.auditLog.create({
      data: {
        action: "USER_DELETED",
        entityType: "User",
        entityId: userId,
        newData: { deletedEmail: user.email },
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
    await requireAdmin();

    const validRoles = ["PARENT", "DAYCARE_OWNER", "DAYCARE_STAFF", "ADMIN"];
    if (!validRoles.includes(newRole)) {
      return { success: false, error: "Invalid role" };
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { role: newRole as "PARENT" | "DAYCARE_OWNER" | "DAYCARE_STAFF" | "ADMIN" },
    });

    await db.auditLog.create({
      data: {
        action: "USER_ROLE_UPDATED",
        entityType: "User",
        entityId: userId,
        newData: { newRole },
      },
    });

    revalidatePath("/admin/users");
    return { success: true, user };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}
