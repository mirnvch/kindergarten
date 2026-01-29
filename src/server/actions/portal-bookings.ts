"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import type { PortalBooking } from "@/types";

export type PortalBookingFilter = "pending" | "confirmed" | "past";

async function getOwnerDaycareId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.role !== "DAYCARE_OWNER" && session.user.role !== "DAYCARE_STAFF") {
    return null;
  }

  const staff = await db.daycareStaff.findFirst({
    where: { userId: session.user.id },
    select: { daycareId: true },
  });

  return staff?.daycareId || null;
}

export async function getPortalBookings(
  filter: PortalBookingFilter = "pending"
): Promise<PortalBooking[]> {
  const daycareId = await getOwnerDaycareId();
  if (!daycareId) {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const bookings = await db.booking.findMany({
    where: {
      daycareId,
      ...(filter === "pending"
        ? {
            status: BookingStatus.PENDING,
          }
        : filter === "confirmed"
          ? {
              status: BookingStatus.CONFIRMED,
              OR: [
                { scheduledAt: { gte: now } },
                { scheduledAt: null },
              ],
            }
          : {
              OR: [
                { status: { in: [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW] } },
                { status: BookingStatus.CONFIRMED, scheduledAt: { lt: now } },
              ],
            }),
    },
    include: {
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
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
  const daycareId = await getOwnerDaycareId();
  if (!daycareId) {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const [pending, confirmed, todayBookings] = await Promise.all([
    db.booking.count({
      where: {
        daycareId,
        status: BookingStatus.PENDING,
      },
    }),
    db.booking.count({
      where: {
        daycareId,
        status: BookingStatus.CONFIRMED,
        scheduledAt: { gte: now },
      },
    }),
    db.booking.count({
      where: {
        daycareId,
        status: BookingStatus.CONFIRMED,
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
  const daycareId = await getOwnerDaycareId();
  if (!daycareId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      daycareId,
      status: BookingStatus.PENDING,
    },
  });

  if (!booking) {
    throw new Error("Booking not found or already processed");
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}

export async function declineBooking(bookingId: string, reason?: string) {
  const daycareId = await getOwnerDaycareId();
  if (!daycareId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      daycareId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
  });

  if (!booking) {
    throw new Error("Booking not found or already processed");
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Declined by daycare",
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}

export async function markBookingCompleted(bookingId: string) {
  const daycareId = await getOwnerDaycareId();
  if (!daycareId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      daycareId,
      status: BookingStatus.CONFIRMED,
    },
  });

  if (!booking) {
    throw new Error("Booking not found or cannot be marked as completed");
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.COMPLETED,
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}

export async function markBookingNoShow(bookingId: string) {
  const daycareId = await getOwnerDaycareId();
  if (!daycareId) {
    throw new Error("Unauthorized");
  }

  // Verify booking belongs to this daycare
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      daycareId,
      status: BookingStatus.CONFIRMED,
    },
  });

  if (!booking) {
    throw new Error("Booking not found or cannot be marked as no-show");
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.NO_SHOW,
    },
  });

  revalidatePath("/portal/bookings");
  revalidatePath("/portal");
}
