"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppointmentStatus } from "@prisma/client";
import type { PortalBooking } from "@/types";

export type PortalBookingFilter = "pending" | "confirmed" | "past";

async function getOwnerDaycareId(): Promise<string | null> {
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

export async function getPortalBookings(
  filter: PortalBookingFilter = "pending"
): Promise<PortalBooking[]> {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const bookings = await db.appointment.findMany({
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

  return bookings;
}

export async function getPortalBookingStats() {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const [pending, confirmed, todayBookings] = await Promise.all([
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

  return { pending, confirmed, todayBookings };
}

export async function confirmBooking(bookingId: string) {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.appointment.findFirst({
    where: {
      id: bookingId,
      providerId,
      status: AppointmentStatus.PENDING,
    },
  });

  if (!booking) {
    throw new Error("Booking not found or already processed");
  }

  await db.appointment.update({
    where: { id: bookingId },
    data: {
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}

export async function declineBooking(bookingId: string, reason?: string) {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.appointment.findFirst({
    where: {
      id: bookingId,
      providerId,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
  });

  if (!booking) {
    throw new Error("Booking not found or already processed");
  }

  await db.appointment.update({
    where: { id: bookingId },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Declined by daycare",
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}

export async function markBookingCompleted(bookingId: string) {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.appointment.findFirst({
    where: {
      id: bookingId,
      providerId,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  if (!booking) {
    throw new Error("Booking not found or cannot be marked as completed");
  }

  await db.appointment.update({
    where: { id: bookingId },
    data: {
      status: AppointmentStatus.COMPLETED,
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}

export async function markBookingNoShow(bookingId: string) {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.appointment.findFirst({
    where: {
      id: bookingId,
      providerId,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  if (!booking) {
    throw new Error("Booking not found or cannot be marked as no-show");
  }

  await db.appointment.update({
    where: { id: bookingId },
    data: {
      status: AppointmentStatus.NO_SHOW,
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}
