"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Child, ChildWithRelations } from "@/types";

const childSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  allergies: z.string().optional(),
  specialNeeds: z.string().optional(),
  notes: z.string().optional(),
});

export type ChildFormData = z.infer<typeof childSchema>;

export async function createChild(data: ChildFormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  const validated = childSchema.parse(data);

  const child = await db.child.create({
    data: {
      parentId: session.user.id,
      firstName: validated.firstName,
      lastName: validated.lastName,
      dateOfBirth: new Date(validated.dateOfBirth),
      gender: validated.gender || null,
      allergies: validated.allergies || null,
      specialNeeds: validated.specialNeeds || null,
      notes: validated.notes || null,
    },
  });

  revalidatePath("/dashboard/children");
  revalidatePath("/dashboard");
  redirect("/dashboard/children");
}

export async function getChildren(): Promise<Child[]> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  const children = await db.child.findMany({
    where: { parentId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return children;
}

export async function getChildById(id: string): Promise<ChildWithRelations | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  const child = await db.child.findFirst({
    where: {
      id,
      parentId: session.user.id,
    },
    include: {
      enrollments: {
        include: {
          daycare: {
            select: { name: true, slug: true },
          },
        },
      },
      bookings: {
        include: {
          daycare: {
            select: { name: true, slug: true },
          },
        },
        orderBy: { scheduledAt: "desc" },
        take: 5,
      },
    },
  });

  return child;
}

export async function updateChild(id: string, data: ChildFormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  const validated = childSchema.parse(data);

  // Verify ownership
  const existing = await db.child.findFirst({
    where: { id, parentId: session.user.id },
  });

  if (!existing) {
    throw new Error("Child not found");
  }

  await db.child.update({
    where: { id },
    data: {
      firstName: validated.firstName,
      lastName: validated.lastName,
      dateOfBirth: new Date(validated.dateOfBirth),
      gender: validated.gender || null,
      allergies: validated.allergies || null,
      specialNeeds: validated.specialNeeds || null,
      notes: validated.notes || null,
    },
  });

  revalidatePath("/dashboard/children");
  revalidatePath(`/dashboard/children/${id}`);
  revalidatePath("/dashboard");
  redirect("/dashboard/children");
}

export async function deleteChild(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.child.findFirst({
    where: { id, parentId: session.user.id },
  });

  if (!existing) {
    throw new Error("Child not found");
  }

  await db.child.delete({
    where: { id },
  });

  revalidatePath("/dashboard/children");
  revalidatePath("/dashboard");
}
