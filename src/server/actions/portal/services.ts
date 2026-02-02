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
    throw new Error("No practice found");
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
  isTelehealth: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export async function createService(data: ServiceInput) {
  try {
    const { provider } = await requireProviderOwner();

    const validated = serviceSchema.parse(data);

    // If telehealth service, verify provider offers telehealth
    if (validated.isTelehealth && !provider.offersTelehealth) {
      return {
        success: false,
        error: "Enable telemedicine in your practice settings before creating telehealth services",
      };
    }

    await db.service.create({
      data: {
        providerId: provider.id,
        name: validated.name,
        description: validated.description || null,
        duration: validated.duration,
        price: new Prisma.Decimal(validated.price),
        isTelehealth: validated.isTelehealth,
        isActive: validated.isActive,
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

    // If telehealth service, verify provider offers telehealth
    if (validated.isTelehealth && !provider.offersTelehealth) {
      return {
        success: false,
        error: "Enable telemedicine in your practice settings before creating telehealth services",
      };
    }

    await db.service.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description || null,
        duration: validated.duration,
        price: new Prisma.Decimal(validated.price),
        isTelehealth: validated.isTelehealth,
        isActive: validated.isActive,
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

    // Check if there are upcoming appointments for this service
    const upcomingAppointments = await db.appointment.count({
      where: {
        serviceId: id,
        scheduledAt: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (upcomingAppointments > 0) {
      // Instead of deleting, mark as inactive
      await db.service.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/portal/practice");
      return {
        success: true,
        message: `Service has ${upcomingAppointments} upcoming appointment(s) and was deactivated instead of deleted.`,
      };
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

export async function toggleServiceActive(id: string, isActive: boolean) {
  try {
    const { provider } = await requireProviderOwner();

    // Verify service belongs to this provider
    const service = await db.service.findFirst({
      where: { id, providerId: provider.id },
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    await db.service.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    console.error("Error toggling service:", error);
    return { success: false, error: "Failed to update service" };
  }
}
