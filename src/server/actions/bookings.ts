"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";

export type BookingFilter = "upcoming" | "past";

export async function getParentBookings(filter: BookingFilter = "upcoming") {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const bookings = await db.booking.findMany({
    where: {
      parentId: session.user.id,
      ...(filter === "upcoming"
        ? {
            OR: [
              { scheduledAt: { gte: now } },
              { scheduledAt: null, status: "PENDING" },
            ],
            status: { in: ["PENDING", "CONFIRMED"] },
          }
        : {
            OR: [
              { scheduledAt: { lt: now } },
              { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
            ],
          }),
    },
    include: {
      daycare: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          city: true,
          state: true,
        },
      },
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      scheduledAt: filter === "upcoming" ? "asc" : "desc",
    },
  });

  return bookings;
}

export async function cancelBooking(id: string, reason?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  // Verify ownership and status
  const booking = await db.booking.findFirst({
    where: {
      id,
      parentId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (!booking) {
    throw new Error("Booking not found or cannot be cancelled");
  }

  await db.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Cancelled by parent",
    },
  });

  revalidatePath("/parent/bookings");
  revalidatePath("/parent");
}
