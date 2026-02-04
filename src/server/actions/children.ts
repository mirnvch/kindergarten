"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FamilyMember, FamilyMemberWithRelations } from "@/types";
import type { ActionResult } from "@/types/action-result";

// Schema for family member form (legacy: child)
const familyMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  relationship: z.string().default("child"),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  conditions: z.string().optional(),
  notes: z.string().optional(),
});

export type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;

/** @deprecated Use FamilyMemberFormData */
export type ChildFormData = FamilyMemberFormData;

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
        relationship: validated.data.relationship || "child",
        allergies: validated.data.allergies || null,
        medications: validated.data.medications || null,
        conditions: validated.data.conditions || null,
        notes: validated.data.notes || null,
      },
    });

    revalidatePath("/dashboard/children");
    revalidatePath("/dashboard/family");
    revalidatePath("/dashboard");

    return { success: true, data: { id: member.id } };
  } catch (error) {
    console.error("Error creating family member:", error);
    return { success: false, error: "Failed to add family member" };
  }
}

/** @deprecated Use createFamilyMember */
export const createChild = createFamilyMember;

export async function getFamilyMembers(): Promise<ActionResult<FamilyMember[]>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to view family members" };
    }

    const members = await db.familyMember.findMany({
      where: { patientId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: members };
  } catch (error) {
    console.error("Error fetching family members:", error);
    return { success: false, error: "Failed to load family members" };
  }
}

/** @deprecated Use getFamilyMembers */
export const getChildren = getFamilyMembers;

export async function getFamilyMemberById(id: string): Promise<ActionResult<FamilyMemberWithRelations | null>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to view family member details" };
    }

    const member = await db.familyMember.findFirst({
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
          take: 5,
        },
      },
    });

    return { success: true, data: member };
  } catch (error) {
    console.error("Error fetching family member:", error);
    return { success: false, error: "Failed to load family member details" };
  }
}

/** @deprecated Use getFamilyMemberById */
export const getChildById = getFamilyMemberById;

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
        relationship: validated.data.relationship || existing.relationship,
        allergies: validated.data.allergies || null,
        medications: validated.data.medications || null,
        conditions: validated.data.conditions || null,
        notes: validated.data.notes || null,
      },
    });

    revalidatePath("/dashboard/children");
    revalidatePath("/dashboard/family");
    revalidatePath(`/dashboard/children/${id}`);
    revalidatePath(`/dashboard/family/${id}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error updating family member:", error);
    return { success: false, error: "Failed to update family member" };
  }
}

/** @deprecated Use updateFamilyMember */
export const updateChild = updateFamilyMember;

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

    await db.familyMember.delete({
      where: { id },
    });

    revalidatePath("/dashboard/children");
    revalidatePath("/dashboard/family");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error deleting family member:", error);
    return { success: false, error: "Failed to delete family member" };
  }
}

/** @deprecated Use deleteFamilyMember */
export const deleteChild = deleteFamilyMember;
