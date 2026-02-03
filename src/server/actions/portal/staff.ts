"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

async function requireDaycareOwner() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const providerStaff = await db.providerStaff.findFirst({
    where: {
      userId: session.user.id,
      role: "owner",
    },
    include: { provider: true },
  });

  if (!providerStaff) {
    throw new Error("Only owners can manage staff");
  }

  return { user: session.user, daycare: providerStaff.provider };
}

export async function getStaff() {
  const { daycare } = await requireDaycareOwner();

  return db.providerStaff.findMany({
    where: { providerId: daycare.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

const addStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["manager", "staff"], {
    message: "Role must be manager or staff",
  }),
});

export type AddStaffInput = z.infer<typeof addStaffSchema>;

export async function addStaff(data: AddStaffInput) {
  try {
    const { daycare } = await requireDaycareOwner();

    const validated = addStaffSchema.parse(data);

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      return {
        success: false,
        error: "No user found with this email. They must register first.",
      };
    }

    // Check if already staff
    const existing = await db.providerStaff.findUnique({
      where: {
        providerId_userId: {
          providerId: daycare.id,
          userId: user.id,
        },
      },
    });

    if (existing) {
      return { success: false, error: "This user is already a staff member" };
    }

    // Add staff
    await db.providerStaff.create({
      data: {
        providerId: daycare.id,
        userId: user.id,
        role: validated.role,
      },
    });

    // Update user role if needed
    if (user.role === "PATIENT") {
      await db.user.update({
        where: { id: user.id },
        data: { role: "CLINIC_STAFF" },
      });
    }

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error adding staff:", error);
    return { success: false, error: "Failed to add staff member" };
  }
}

export async function updateStaffRole(staffId: string, role: "manager" | "staff") {
  try {
    const { daycare } = await requireDaycareOwner();

    // Verify staff belongs to this daycare and is not owner
    const staff = await db.providerStaff.findFirst({
      where: { id: staffId, providerId: daycare.id },
    });

    if (!staff) {
      return { success: false, error: "Staff member not found" };
    }

    if (staff.role === "owner") {
      return { success: false, error: "Cannot change owner role" };
    }

    await db.providerStaff.update({
      where: { id: staffId },
      data: { role },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error updating staff role:", error);
    return { success: false, error: "Failed to update staff role" };
  }
}

export async function removeStaff(staffId: string) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Verify staff belongs to this daycare and is not owner
    const staff = await db.providerStaff.findFirst({
      where: { id: staffId, providerId: daycare.id },
      include: { user: true },
    });

    if (!staff) {
      return { success: false, error: "Staff member not found" };
    }

    if (staff.role === "owner") {
      return { success: false, error: "Cannot remove owner" };
    }

    await db.providerStaff.delete({
      where: { id: staffId },
    });

    // Check if user is staff at any other daycare
    const otherStaffRoles = await db.providerStaff.findFirst({
      where: { userId: staff.userId },
    });

    // If not, revert to PATIENT role
    if (!otherStaffRoles && staff.user.role === "CLINIC_STAFF") {
      await db.user.update({
        where: { id: staff.userId },
        data: { role: "PATIENT" },
      });
    }

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error removing staff:", error);
    return { success: false, error: "Failed to remove staff member" };
  }
}

export async function toggleStaffActive(staffId: string) {
  try {
    const { daycare } = await requireDaycareOwner();

    const staff = await db.providerStaff.findFirst({
      where: { id: staffId, providerId: daycare.id },
    });

    if (!staff) {
      return { success: false, error: "Staff member not found" };
    }

    if (staff.role === "owner") {
      return { success: false, error: "Cannot deactivate owner" };
    }

    await db.providerStaff.update({
      where: { id: staffId },
      data: { isActive: !staff.isActive },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error toggling staff status:", error);
    return { success: false, error: "Failed to update staff status" };
  }
}
