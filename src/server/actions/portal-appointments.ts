"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppointmentStatus } from "@prisma/client";
import type { PortalAppointment } from "@/types";

export type PortalAppointmentFilter = "pending" | "confirmed" | "past";

async function getOwnerProviderId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.role !== "PROVIDER" && session.user.role !== "CLINIC_STAFF") {
    return null;
  }

  const staff = await db.providerStaff.findFirst({
    where: { userId: session.user.id },
    select: { providerId: true },
  });

  return staff?.providerId || null;
}

export async function getPortalAppointments(
  filter: PortalAppointmentFilter = "pending"
): Promise<PortalAppointment[]> {
  const providerId = await getOwnerProviderId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const appointments = await db.appointment.findMany({
    where: {
      providerId,
      ...(filter === "pending"
        ? {
            status: AppointmentStatus.PENDING,
          }
        : filter === "confirmed"
          ? {
              status: AppointmentStatus.CONFIRMED,
              scheduledAt: { gte: now },
            }
          : {
              OR: [
                { status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] } },
                { status: AppointmentStatus.CONFIRMED, scheduledAt: { lt: now } },
              ],
            }),
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      familyMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
        },
      },
    },
    orderBy: [
      { scheduledAt: filter === "past" ? "desc" : "asc" },
      { createdAt: "desc" },
    ],
  });

  return appointments;
}

export async function getPortalAppointmentStats() {
  const providerId = await getOwnerProviderId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const [pending, confirmed, todayAppointments] = await Promise.all([
    db.appointment.count({
      where: {
        providerId,
        status: AppointmentStatus.PENDING,
      },
    }),
    db.appointment.count({
      where: {
        providerId,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: { gte: now },
      },
    }),
    db.appointment.count({
      where: {
        providerId,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: {
          gte: new Date(now.toDateString()),
          lt: new Date(new Date(now.toDateString()).getTime() + 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return { pending, confirmed, todayAppointments };
}

export async function confirmAppointment(appointmentId: string) {
  const providerId = await getOwnerProviderId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify appointment belongs to this provider
  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      providerId,
      status: AppointmentStatus.PENDING,
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found or already processed");
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/portal/appointments");
  revalidatePath("/portal");
}

export async function declineAppointment(appointmentId: string, reason?: string) {
  const providerId = await getOwnerProviderId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify appointment belongs to this provider
  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      providerId,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found or already processed");
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Declined by provider",
    },
  });

  revalidatePath("/portal/appointments");
  revalidatePath("/portal");
}

export async function markAppointmentCompleted(appointmentId: string) {
  const providerId = await getOwnerProviderId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify appointment belongs to this provider
  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      providerId,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found or cannot be marked as completed");
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.COMPLETED,
    },
  });

  revalidatePath("/portal/appointments");
  revalidatePath("/portal");
}

export async function markAppointmentNoShow(appointmentId: string) {
  const providerId = await getOwnerProviderId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify appointment belongs to this provider
  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      providerId,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found or cannot be marked as no-show");
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.NO_SHOW,
    },
  });

  revalidatePath("/portal/appointments");
  revalidatePath("/portal");
}

// Add telemedicine meeting link
export async function addTelehealthLink(appointmentId: string, meetingUrl: string) {
  const providerId = await getOwnerProviderId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify appointment belongs to this provider and is telemedicine
  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      providerId,
      isTelemedicine: true,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
  });

  if (!appointment) {
    throw new Error("Telemedicine appointment not found");
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: { meetingUrl },
  });

  revalidatePath("/portal/appointments");
  return { success: true };
}
