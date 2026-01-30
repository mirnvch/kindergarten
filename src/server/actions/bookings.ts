"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { BookingStatus, BookingType, DaycareStatus } from "@prisma/client";
import { z } from "zod";
import {
  generateAvailableSlots,
  generateRecurringDates,
  generateSeriesId,
  getDefaultRecurrenceEndDate,
  type DayAvailability,
  type RecurrencePattern,
} from "@/lib/booking-utils";
import type { BookingWithRelations, BookingFull } from "@/types";

export type BookingFilter = "upcoming" | "past";

export async function getParentBookings(
  filter: BookingFilter = "upcoming"
): Promise<BookingWithRelations[]> {
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
    include: {
      daycare: { select: { slug: true } },
    },
  });

  if (!booking) {
    throw new Error("Booking not found or cannot be cancelled");
  }

  // Check cancellation policy (must be at least 24 hours before)
  if (booking.scheduledAt) {
    const hoursUntilBooking = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilBooking < 24) {
      throw new Error("Cancellations must be made at least 24 hours in advance");
    }
  }

  await db.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Cancelled by parent",
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
}

// ==================== CANCEL BOOKING SERIES ====================

export async function cancelBookingSeries(seriesId: string, reason?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  // Verify ownership and get all bookings in series
  const bookings = await db.booking.findMany({
    where: {
      seriesId,
      parentId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (bookings.length === 0) {
    throw new Error("No bookings found in this series");
  }

  // Check cancellation policy for all future bookings
  const now = Date.now();
  const futureBookings = bookings.filter(
    (b) => b.scheduledAt && b.scheduledAt.getTime() > now
  );

  for (const booking of futureBookings) {
    if (booking.scheduledAt) {
      const hoursUntilBooking = (booking.scheduledAt.getTime() - now) / (1000 * 60 * 60);
      if (hoursUntilBooking < 24) {
        throw new Error(
          `Cannot cancel booking on ${booking.scheduledAt.toLocaleDateString()} - less than 24 hours away`
        );
      }
    }
  }

  // Cancel all future bookings in the series
  await db.booking.updateMany({
    where: {
      seriesId,
      parentId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gt: new Date() },
    },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Series cancelled by parent",
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");

  return { cancelledCount: futureBookings.length };
}

// ==================== GET SERIES BOOKINGS ====================

export async function getSeriesBookings(seriesId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const bookings = await db.booking.findMany({
    where: {
      seriesId,
      OR: [
        { parentId: session.user.id },
        {
          daycare: {
            staff: { some: { userId: session.user.id } },
          },
        },
      ],
    },
    include: {
      daycare: {
        select: {
          name: true,
          slug: true,
        },
      },
      child: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return bookings;
}

// ==================== RESCHEDULE BOOKING ====================

const rescheduleSchema = z.object({
  bookingId: z.string().min(1),
  newScheduledAt: z.string().datetime("Invalid date/time"),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;

export async function rescheduleBooking(input: RescheduleInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  const validated = rescheduleSchema.parse(input);

  // Verify ownership and status
  const booking = await db.booking.findFirst({
    where: {
      id: validated.bookingId,
      parentId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      daycare: { select: { id: true, slug: true } },
    },
  });

  if (!booking) {
    throw new Error("Booking not found or cannot be rescheduled");
  }

  const newScheduledAt = new Date(validated.newScheduledAt);

  // Verify new slot is at least 24 hours ahead
  const minTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (newScheduledAt < minTime) {
    throw new Error("Please select a time at least 24 hours in advance");
  }

  // Check for conflicts at new time
  const conflictingBooking = await db.booking.findFirst({
    where: {
      daycareId: booking.daycareId,
      type: BookingType.TOUR,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      id: { not: booking.id }, // Exclude current booking
      scheduledAt: {
        gte: new Date(newScheduledAt.getTime() - 30 * 60 * 1000),
        lt: new Date(newScheduledAt.getTime() + 30 * 60 * 1000),
      },
    },
  });

  if (conflictingBooking) {
    throw new Error("This time slot is no longer available");
  }

  // Update booking with new time
  await db.booking.update({
    where: { id: booking.id },
    data: {
      scheduledAt: newScheduledAt,
      status: BookingStatus.PENDING, // Reset to pending for reconfirmation
      notes: booking.notes
        ? `${booking.notes}\n\nRescheduled from ${booking.scheduledAt?.toISOString()}`
        : `Rescheduled from ${booking.scheduledAt?.toISOString()}`,
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
  revalidatePath(`/daycare/${booking.daycare.slug}`);

  return { success: true };
}

// ==================== SLOT AVAILABILITY ====================

export async function getAvailableSlots(
  daycareId: string,
  startDate?: Date,
  endDate?: Date
): Promise<DayAvailability[]> {
  const daycare = await db.daycare.findUnique({
    where: { id: daycareId, status: DaycareStatus.APPROVED, deletedAt: null },
    select: {
      openingTime: true,
      closingTime: true,
      operatingDays: true,
    },
  });

  if (!daycare) {
    throw new Error("Daycare not found");
  }

  // Get existing bookings for the time period
  const now = new Date();
  const start = startDate || now;
  const end = endDate || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const existingBookings = await db.booking.findMany({
    where: {
      daycareId,
      type: BookingType.TOUR,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      scheduledAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      scheduledAt: true,
      duration: true,
      status: true,
    },
  });

  const daysAhead = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  return generateAvailableSlots(
    {
      openingTime: daycare.openingTime,
      closingTime: daycare.closingTime,
      operatingDays: daycare.operatingDays,
    },
    existingBookings.map((b) => ({
      scheduledAt: b.scheduledAt,
      duration: b.duration,
      status: b.status,
    })),
    daysAhead,
    30 // 30-minute slots for tours
  );
}

// ==================== BOOKING QUERIES ====================

export async function getBookingById(id: string): Promise<BookingFull | null> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      daycare: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          phone: true,
          email: true,
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
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!booking) {
    return null;
  }

  // Verify user has access to this booking
  const isParent = booking.parentId === session.user.id;
  const isDaycareOwner =
    session.user.role === "DAYCARE_OWNER" &&
    (await db.daycareStaff.findFirst({
      where: { daycareId: booking.daycareId, userId: session.user.id },
    }));

  if (!isParent && !isDaycareOwner && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return booking;
}

// ==================== TOUR BOOKING ====================

const tourBookingSchema = z.object({
  daycareId: z.string().min(1, "Daycare is required"),
  childId: z.string().min(1, "Please select a child"),
  scheduledAt: z.string().datetime("Invalid date/time"),
  notes: z.string().optional(),
  // Recurrence options
  recurrence: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional().default("NONE"),
  recurrenceEndDate: z.string().datetime().optional(),
});

export type TourBookingInput = z.infer<typeof tourBookingSchema>;

export async function createTourBooking(input: TourBookingInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  // Rate limit: 10 bookings per minute
  const rateLimitResult = await rateLimit(session.user.id, "booking");
  if (!rateLimitResult.success) {
    throw new Error("Too many booking requests. Please try again later.");
  }

  const validated = tourBookingSchema.parse(input);

  // Verify child belongs to parent
  const child = await db.child.findFirst({
    where: {
      id: validated.childId,
      parentId: session.user.id,
    },
  });

  if (!child) {
    throw new Error("Child not found");
  }

  // Verify daycare is approved
  const daycare = await db.daycare.findUnique({
    where: {
      id: validated.daycareId,
      status: DaycareStatus.APPROVED,
      deletedAt: null,
    },
  });

  if (!daycare) {
    throw new Error("Daycare not found or not available");
  }

  const scheduledAt = new Date(validated.scheduledAt);

  // Verify slot is at least 24 hours ahead
  const minTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (scheduledAt < minTime) {
    throw new Error("Please select a time at least 24 hours in advance");
  }

  // Handle recurring bookings
  const recurrencePattern = (validated.recurrence || "NONE") as RecurrencePattern;
  const isRecurring = recurrencePattern !== "NONE";

  let bookingDates: Date[] = [scheduledAt];
  let seriesId: string | null = null;

  if (isRecurring) {
    const endDate = validated.recurrenceEndDate
      ? new Date(validated.recurrenceEndDate)
      : getDefaultRecurrenceEndDate(scheduledAt);

    bookingDates = generateRecurringDates({
      pattern: recurrencePattern,
      startDate: scheduledAt,
      endDate,
    });

    seriesId = generateSeriesId();
  }

  // Check for conflicts with ALL recurring dates
  for (const date of bookingDates) {
    const conflictingBooking = await db.booking.findFirst({
      where: {
        daycareId: validated.daycareId,
        type: BookingType.TOUR,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        scheduledAt: {
          gte: new Date(date.getTime() - 30 * 60 * 1000),
          lt: new Date(date.getTime() + 30 * 60 * 1000),
        },
      },
    });

    if (conflictingBooking) {
      throw new Error(
        isRecurring
          ? `Time slot on ${date.toLocaleDateString()} is not available. Please choose a different time.`
          : "This time slot is no longer available"
      );
    }
  }

  // Create all bookings (single or recurring series)
  const bookings = await db.$transaction(
    bookingDates.map((date, index) =>
      db.booking.create({
        data: {
          parentId: session.user.id,
          daycareId: validated.daycareId,
          childId: validated.childId,
          type: BookingType.TOUR,
          status: BookingStatus.PENDING,
          scheduledAt: date,
          duration: 30,
          notes: validated.notes || null,
          recurrence: recurrencePattern,
          recurrenceEndDate: isRecurring ? bookingDates[bookingDates.length - 1] : null,
          seriesId,
        },
      })
    )
  );

  const firstBooking = bookings[0];

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
  revalidatePath(`/daycare/${daycare.slug}`);

  redirect(`/booking/${firstBooking.id}/confirmation${isRecurring ? `?series=${bookings.length}` : ""}`);
}

// ==================== ENROLLMENT REQUEST ====================

const enrollmentSchema = z.object({
  daycareId: z.string().min(1, "Daycare is required"),
  childId: z.string().min(1, "Please select a child"),
  programId: z.string().optional(),
  schedule: z.enum(["full-time", "part-time", "before-after"]),
  desiredStartDate: z.string().min(1, "Please select a start date"),
  notes: z.string().optional(),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

export async function createEnrollmentRequest(input: EnrollmentInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  // Rate limit: 10 bookings per minute
  const rateLimitResult = await rateLimit(session.user.id, "booking");
  if (!rateLimitResult.success) {
    throw new Error("Too many booking requests. Please try again later.");
  }

  const validated = enrollmentSchema.parse(input);

  // Verify child belongs to parent
  const child = await db.child.findFirst({
    where: {
      id: validated.childId,
      parentId: session.user.id,
    },
  });

  if (!child) {
    throw new Error("Child not found");
  }

  // Verify daycare is approved
  const daycare = await db.daycare.findUnique({
    where: {
      id: validated.daycareId,
      status: DaycareStatus.APPROVED,
      deletedAt: null,
    },
  });

  if (!daycare) {
    throw new Error("Daycare not found or not available");
  }

  // Build notes with enrollment details
  const enrollmentNotes = [
    `Schedule: ${validated.schedule}`,
    `Desired Start: ${validated.desiredStartDate}`,
    validated.programId ? `Program ID: ${validated.programId}` : null,
    validated.notes ? `Additional Notes: ${validated.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Create enrollment booking
  const booking = await db.booking.create({
    data: {
      parentId: session.user.id,
      daycareId: validated.daycareId,
      childId: validated.childId,
      type: BookingType.ENROLLMENT,
      status: BookingStatus.PENDING,
      scheduledAt: new Date(validated.desiredStartDate),
      notes: enrollmentNotes,
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
  revalidatePath(`/daycare/${daycare.slug}`);

  redirect(`/booking/${booking.id}/confirmation`);
}
