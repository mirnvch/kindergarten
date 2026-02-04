"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FamilyMember, FamilyMemberWithRelations } from "@/types";
import type { ActionResult } from "@/types/action-result";

const familyMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  relationship: z.string().min(1, "Relationship is required"), // "child", "spouse", "parent", "self"
  // Medical info
  allergies: z.string().optional(),
  medications: z.string().optional(),
  conditions: z.string().optional(),
  bloodType: z.string().optional(),
  notes: z.string().optional(),
});

export type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;

export async function createFamilyMember(data: FamilyMemberFormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to add family members" };
    }

    const validated = familyMemberSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid data" };
    }

    const member = await db.familyMember.create({
      data: {
        patientId: session.user.id,
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        dateOfBirth: new Date(validated.data.dateOfBirth),
        gender: validated.data.gender || null,
        relationship: validated.data.relationship,
        allergies: validated.data.allergies || null,
        medications: validated.data.medications || null,
        conditions: validated.data.conditions || null,
        bloodType: validated.data.bloodType || null,
        notes: validated.data.notes || null,
      },
    });

    revalidatePath("/dashboard/family");
    revalidatePath("/dashboard");

    return { success: true, data: { id: member.id } };
  } catch (error) {
    console.error("Error creating family member:", error);
    return { success: false, error: "Failed to add family member" };
  }
}

export async function getFamilyMembers(): Promise<ActionResult<FamilyMember[]>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to view family members" };
    }

    const familyMembers = await db.familyMember.findMany({
      where: { patientId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: familyMembers };
  } catch (error) {
    console.error("Error fetching family members:", error);
    return { success: false, error: "Failed to load family members" };
  }
}

export async function getFamilyMemberById(id: string): Promise<ActionResult<FamilyMemberWithRelations | null>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to view family member details" };
    }

    const familyMember = await db.familyMember.findFirst({
      where: {
        id,
        patientId: session.user.id,
      },
      include: {
        appointments: {
          include: {
            provider: {
              select: { name: true, slug: true, specialty: true },
            },
          },
          orderBy: { scheduledAt: "desc" },
          take: 10,
        },
      },
    });

    return { success: true, data: familyMember };
  } catch (error) {
    console.error("Error fetching family member:", error);
    return { success: false, error: "Failed to load family member details" };
  }
}

export async function updateFamilyMember(id: string, data: FamilyMemberFormData): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to update family members" };
    }

    const validated = familyMemberSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid data" };
    }

    // Verify ownership
    const existing = await db.familyMember.findFirst({
      where: { id, patientId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "Family member not found" };
    }

    await db.familyMember.update({
      where: { id },
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        dateOfBirth: new Date(validated.data.dateOfBirth),
        gender: validated.data.gender || null,
        relationship: validated.data.relationship,
        allergies: validated.data.allergies || null,
        medications: validated.data.medications || null,
        conditions: validated.data.conditions || null,
        bloodType: validated.data.bloodType || null,
        notes: validated.data.notes || null,
      },
    });

    revalidatePath("/dashboard/family");
    revalidatePath(`/dashboard/family/${id}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error updating family member:", error);
    return { success: false, error: "Failed to update family member" };
  }
}

export async function deleteFamilyMember(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to delete family members" };
    }

    // Verify ownership
    const existing = await db.familyMember.findFirst({
      where: { id, patientId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "Family member not found" };
    }

    // Check if there are any upcoming appointments
    const upcomingAppointments = await db.appointment.count({
      where: {
        familyMemberId: id,
        scheduledAt: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (upcomingAppointments > 0) {
      return {
        success: false,
        error: `Cannot delete family member with ${upcomingAppointments} upcoming appointment(s). Please cancel them first.`,
      };
    }

    await db.familyMember.delete({
      where: { id },
    });

    revalidatePath("/dashboard/family");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error deleting family member:", error);
    return { success: false, error: "Failed to delete family member" };
  }
}
