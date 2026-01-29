"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

async function requireDaycareOwner() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const daycareStaff = await db.daycareStaff.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["owner", "manager"] },
    },
    include: { daycare: true },
  });

  if (!daycareStaff) {
    throw new Error("No daycare found");
  }

  return { user: session.user, daycare: daycareStaff.daycare };
}

export async function getPrograms() {
  const { daycare } = await requireDaycareOwner();

  return db.program.findMany({
    where: { daycareId: daycare.id },
    orderBy: { ageMin: "asc" },
  });
}

const programSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  ageMin: z.number().min(0, "Minimum age must be at least 0"),
  ageMax: z.number().min(1, "Maximum age must be at least 1"),
  price: z.number().min(0, "Price must be at least 0"),
  schedule: z.string().optional(),
});

export type ProgramInput = z.infer<typeof programSchema>;

export async function createProgram(data: ProgramInput) {
  try {
    const { daycare } = await requireDaycareOwner();

    const validated = programSchema.parse(data);

    await db.program.create({
      data: {
        daycareId: daycare.id,
        name: validated.name,
        description: validated.description || null,
        ageMin: validated.ageMin,
        ageMax: validated.ageMax,
        price: new Prisma.Decimal(validated.price),
        schedule: validated.schedule || null,
      },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating program:", error);
    return { success: false, error: "Failed to create program" };
  }
}

export async function updateProgram(id: string, data: ProgramInput) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Verify program belongs to this daycare
    const program = await db.program.findFirst({
      where: { id, daycareId: daycare.id },
    });

    if (!program) {
      return { success: false, error: "Program not found" };
    }

    const validated = programSchema.parse(data);

    await db.program.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description || null,
        ageMin: validated.ageMin,
        ageMax: validated.ageMax,
        price: new Prisma.Decimal(validated.price),
        schedule: validated.schedule || null,
      },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating program:", error);
    return { success: false, error: "Failed to update program" };
  }
}

export async function deleteProgram(id: string) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Verify program belongs to this daycare
    const program = await db.program.findFirst({
      where: { id, daycareId: daycare.id },
    });

    if (!program) {
      return { success: false, error: "Program not found" };
    }

    await db.program.delete({
      where: { id },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error deleting program:", error);
    return { success: false, error: "Failed to delete program" };
  }
}
