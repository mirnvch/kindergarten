"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { AppointmentStatus, AppointmentType, ProviderStatus } from "@prisma/client";
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
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const now = new Date();

  const bookings = await db.appointment.findMany({
    where: {
      patientId: session.user.id,
      ...(filter === "upcoming"
        ? {
            scheduledAt: { gte: now },
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
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          city: true,
          state: true,
          specialty: true,
        },
      },
      familyMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
    orderBy: {
      scheduledAt: filter === "upcoming" ? "asc" : "desc",
    },
  });

  return bookings;
}

export async function cancelBooking(id: string, reason?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  // Verify ownership and status
  const booking = await db.appointment.findFirst({
    where: {
      id,
      patientId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      provider: { select: { slug: true } },
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

  await db.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.CANCELLED,
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
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  // Verify ownership and get all bookings in series
  const bookings = await db.appointment.findMany({
    where: {
      seriesId,
      patientId: session.user.id,
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
  await db.appointment.updateMany({
    where: {
      seriesId,
      patientId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gt: new Date() },
    },
    data: {
      status: AppointmentStatus.CANCELLED,
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

  const bookings = await db.appointment.findMany({
    where: {
      seriesId,
      OR: [
        { patientId: session.user.id },
        {
          provider: {
            staff: { some: { userId: session.user.id } },
          },
        },
      ],
    },
    include: {
      provider: {
        select: {
          name: true,
          slug: true,
        },
      },
      familyMember: {
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
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const validated = rescheduleSchema.parse(input);

  // Verify ownership and status
  const booking = await db.appointment.findFirst({
    where: {
      id: validated.bookingId,
      patientId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      provider: { select: { id: true, slug: true } },
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
  const conflictingBooking = await db.appointment.findFirst({
    where: {
      providerId: booking.providerId,
      type: AppointmentType.IN_PERSON,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
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
  await db.appointment.update({
    where: { id: booking.id },
    data: {
      scheduledAt: newScheduledAt,
      status: AppointmentStatus.PENDING, // Reset to pending for reconfirmation
      notes: booking.notes
        ? `${booking.notes}\n\nRescheduled from ${booking.scheduledAt?.toISOString()}`
        : `Rescheduled from ${booking.scheduledAt?.toISOString()}`,
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
  revalidatePath(`/provider/${booking.provider.slug}`);

  return { success: true };
}

// ==================== SLOT AVAILABILITY ====================

export async function getAvailableSlots(
  providerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<DayAvailability[]> {
  const daycare = await db.provider.findUnique({
    where: { id: providerId, status: ProviderStatus.APPROVED, deletedAt: null },
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

  const existingBookings = await db.appointment.findMany({
    where: {
      providerId,
      type: AppointmentType.IN_PERSON,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
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

  const booking = await db.appointment.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          specialty: true,
          offersTelehealth: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          phone: true,
          email: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
          isTelehealth: true,
        },
      },
      familyMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          relationship: true,
        },
      },
      patient: {
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
  const isParent = booking.patientId === session.user.id;
  const isDaycareOwner =
    session.user.role === "PROVIDER" &&
    (await db.providerStaff.findFirst({
      where: { providerId: booking.providerId, userId: session.user.id },
    }));

  if (!isParent && !isDaycareOwner && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return booking;
}

// ==================== TOUR BOOKING ====================

const tourBookingSchema = z.object({
  providerId: z.string().min(1, "Daycare is required"),
  familyMemberId: z.string().min(1, "Please select a child"),
  scheduledAt: z.string().datetime("Invalid date/time"),
  notes: z.string().optional(),
  // Recurrence options
  recurrence: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional().default("NONE"),
  recurrenceEndDate: z.string().datetime().optional(),
});

export type TourBookingInput = z.infer<typeof tourBookingSchema>;

export async function createTourBooking(input: TourBookingInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  // Rate limit: 10 bookings per minute
  const rateLimitResult = await rateLimit(session.user.id, "booking");
  if (!rateLimitResult.success) {
    throw new Error("Too many booking requests. Please try again later.");
  }

  const validated = tourBookingSchema.parse(input);

  // Verify child belongs to parent
  const child = await db.familyMember.findFirst({
    where: {
      id: validated.familyMemberId,
      patientId: session.user.id,
    },
  });

  if (!child) {
    throw new Error("Child not found");
  }

  // Verify daycare is approved
  const daycare = await db.provider.findUnique({
    where: {
      id: validated.providerId,
      status: ProviderStatus.APPROVED,
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
    const conflictingBooking = await db.appointment.findFirst({
      where: {
        providerId: validated.providerId,
        type: AppointmentType.IN_PERSON,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
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
    bookingDates.map((date) =>
      db.appointment.create({
        data: {
          patientId: session.user.id,
          providerId: validated.providerId,
          familyMemberId: validated.familyMemberId,
          type: AppointmentType.IN_PERSON,
          status: AppointmentStatus.PENDING,
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
  revalidatePath(`/provider/${daycare.slug}`);

  redirect(`/booking/${firstBooking.id}/confirmation${isRecurring ? `?series=${bookings.length}` : ""}`);
}

// ==================== ENROLLMENT REQUEST ====================

const enrollmentSchema = z.object({
  providerId: z.string().min(1, "Daycare is required"),
  familyMemberId: z.string().min(1, "Please select a child"),
  programId: z.string().optional(),
  schedule: z.enum(["full-time", "part-time", "before-after"]),
  desiredStartDate: z.string().min(1, "Please select a start date"),
  notes: z.string().optional(),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

export async function createEnrollmentRequest(input: EnrollmentInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  // Rate limit: 10 bookings per minute
  const rateLimitResult = await rateLimit(session.user.id, "booking");
  if (!rateLimitResult.success) {
    throw new Error("Too many booking requests. Please try again later.");
  }

  const validated = enrollmentSchema.parse(input);

  // Verify child belongs to parent
  const child = await db.familyMember.findFirst({
    where: {
      id: validated.familyMemberId,
      patientId: session.user.id,
    },
  });

  if (!child) {
    throw new Error("Child not found");
  }

  // Verify daycare is approved
  const daycare = await db.provider.findUnique({
    where: {
      id: validated.providerId,
      status: ProviderStatus.APPROVED,
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
  const booking = await db.appointment.create({
    data: {
      patientId: session.user.id,
      providerId: validated.providerId,
      familyMemberId: validated.familyMemberId,
      type: AppointmentType.IN_PERSON,
      status: AppointmentStatus.PENDING,
      scheduledAt: new Date(validated.desiredStartDate),
      duration: 30, // Default 30 minute consultation
      notes: enrollmentNotes,
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
  revalidatePath(`/provider/${daycare.slug}`);

  redirect(`/booking/${booking.id}/confirmation`);
}
