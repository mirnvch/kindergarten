"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

async function requireProviderOwner() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const providerStaff = await db.providerStaff.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["owner", "manager"] },
    },
    include: { provider: true },
  });

  if (!providerStaff) {
    throw new Error("No provider found");
  }

  return { user: session.user, provider: providerStaff.provider };
}

export async function getServices() {
  const { provider } = await requireProviderOwner();

  return db.service.findMany({
    where: { providerId: provider.id },
    orderBy: { name: "asc" },
  });
}

const serviceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  price: z.number().min(0, "Price must be at least 0"),
  isTelehealth: z.boolean().default(false),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

/** @deprecated Use ServiceInput */
export type ProgramInput = ServiceInput;

export async function createService(data: ServiceInput) {
  try {
    const { provider } = await requireProviderOwner();

    const validated = serviceSchema.parse(data);

    await db.service.create({
      data: {
        providerId: provider.id,
        name: validated.name,
        description: validated.description || null,
        duration: validated.duration,
        price: new Prisma.Decimal(validated.price),
        isTelehealth: validated.isTelehealth,
      },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating service:", error);
    return { success: false, error: "Failed to create service" };
  }
}

/** @deprecated Use createService */
export const createProgram = createService;

export async function updateService(id: string, data: ServiceInput) {
  try {
    const { provider } = await requireProviderOwner();

    // Verify service belongs to this provider
    const service = await db.service.findFirst({
      where: { id, providerId: provider.id },
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    const validated = serviceSchema.parse(data);

    await db.service.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description || null,
        duration: validated.duration,
        price: new Prisma.Decimal(validated.price),
        isTelehealth: validated.isTelehealth,
      },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating service:", error);
    return { success: false, error: "Failed to update service" };
  }
}

/** @deprecated Use updateService */
export const updateProgram = updateService;

export async function deleteService(id: string) {
  try {
    const { provider } = await requireProviderOwner();

    // Verify service belongs to this provider
    const service = await db.service.findFirst({
      where: { id, providerId: provider.id },
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    await db.service.delete({
      where: { id },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Failed to delete service" };
  }
}

/** @deprecated Use deleteService */
export const deleteProgram = deleteService;

/** @deprecated Use getServices */
export const getPrograms = getServices;
