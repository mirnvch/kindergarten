"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FamilyMember, FamilyMemberWithRelations } from "@/types";

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

export async function createFamilyMember(data: FamilyMemberFormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const validated = familyMemberSchema.parse(data);

  await db.familyMember.create({
    data: {
      patientId: session.user.id,
      firstName: validated.firstName,
      lastName: validated.lastName,
      dateOfBirth: new Date(validated.dateOfBirth),
      gender: validated.gender || null,
      relationship: validated.relationship || "child",
      allergies: validated.allergies || null,
      medications: validated.medications || null,
      conditions: validated.conditions || null,
      notes: validated.notes || null,
    },
  });

  revalidatePath("/dashboard/children");
  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard");
  redirect("/dashboard/children");
}

/** @deprecated Use createFamilyMember */
export const createChild = createFamilyMember;

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const members = await db.familyMember.findMany({
    where: { patientId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return members;
}

/** @deprecated Use getFamilyMembers */
export const getChildren = getFamilyMembers;

export async function getFamilyMemberById(id: string): Promise<FamilyMemberWithRelations | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
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

  return member;
}

/** @deprecated Use getFamilyMemberById */
export const getChildById = getFamilyMemberById;

export async function updateFamilyMember(id: string, data: FamilyMemberFormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const validated = familyMemberSchema.parse(data);

  // Verify ownership
  const existing = await db.familyMember.findFirst({
    where: { id, patientId: session.user.id },
  });

  if (!existing) {
    throw new Error("Family member not found");
  }

  await db.familyMember.update({
    where: { id },
    data: {
      firstName: validated.firstName,
      lastName: validated.lastName,
      dateOfBirth: new Date(validated.dateOfBirth),
      gender: validated.gender || null,
      relationship: validated.relationship || existing.relationship,
      allergies: validated.allergies || null,
      medications: validated.medications || null,
      conditions: validated.conditions || null,
      notes: validated.notes || null,
    },
  });

  revalidatePath("/dashboard/children");
  revalidatePath("/dashboard/family");
  revalidatePath(`/dashboard/children/${id}`);
  revalidatePath(`/dashboard/family/${id}`);
  revalidatePath("/dashboard");
  redirect("/dashboard/children");
}

/** @deprecated Use updateFamilyMember */
export const updateChild = updateFamilyMember;

export async function deleteFamilyMember(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.familyMember.findFirst({
    where: { id, patientId: session.user.id },
  });

  if (!existing) {
    throw new Error("Family member not found");
  }

  await db.familyMember.delete({
    where: { id },
  });

  revalidatePath("/dashboard/children");
  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard");
}

/** @deprecated Use deleteFamilyMember */
export const deleteChild = deleteFamilyMember;
