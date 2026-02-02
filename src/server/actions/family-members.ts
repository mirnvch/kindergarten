"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FamilyMember, FamilyMemberWithRelations } from "@/types";

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

export async function createFamilyMember(data: FamilyMemberFormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const validated = familyMemberSchema.parse(data);

  const familyMember = await db.familyMember.create({
    data: {
      patientId: session.user.id,
      firstName: validated.firstName,
      lastName: validated.lastName,
      dateOfBirth: new Date(validated.dateOfBirth),
      gender: validated.gender || null,
      relationship: validated.relationship,
      allergies: validated.allergies || null,
      medications: validated.medications || null,
      conditions: validated.conditions || null,
      bloodType: validated.bloodType || null,
      notes: validated.notes || null,
    },
  });

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard");
  redirect("/dashboard/family");
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const familyMembers = await db.familyMember.findMany({
    where: { patientId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return familyMembers;
}

export async function getFamilyMemberById(id: string): Promise<FamilyMemberWithRelations | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
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

  return familyMember;
}

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
      relationship: validated.relationship,
      allergies: validated.allergies || null,
      medications: validated.medications || null,
      conditions: validated.conditions || null,
      bloodType: validated.bloodType || null,
      notes: validated.notes || null,
    },
  });

  revalidatePath("/dashboard/family");
  revalidatePath(`/dashboard/family/${id}`);
  revalidatePath("/dashboard");
  redirect("/dashboard/family");
}

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

  // Check if there are any upcoming appointments
  const upcomingAppointments = await db.appointment.count({
    where: {
      familyMemberId: id,
      scheduledAt: { gte: new Date() },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (upcomingAppointments > 0) {
    throw new Error(
      `Cannot delete family member with ${upcomingAppointments} upcoming appointment(s). Please cancel them first.`
    );
  }

  await db.familyMember.delete({
    where: { id },
  });

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard");
}
