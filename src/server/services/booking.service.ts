/**
 * Booking Service - Pure business logic for booking operations.
 *
 * This service contains clean business logic without:
 * - Authentication checks (handled by actions)
 * - Rate limiting (handled by actions)
 * - Cache revalidation (handled by actions)
 * - Redirects (handled by actions)
 *
 * This separation allows for:
 * - Easy unit testing of business logic
 * - Reuse across different action contexts
 * - Clear separation of concerns
 */

import { db } from "@/lib/db";
import { BookingStatus, BookingType, DaycareStatus } from "@prisma/client";
import {
  generateAvailableSlots,
  generateRecurringDates,
  generateSeriesId,
  getDefaultRecurrenceEndDate,
  type DayAvailability,
  type RecurrencePattern,
} from "@/lib/booking-utils";

// ==================== CONSTANTS ====================

const CANCELLATION_HOURS_AHEAD = 24;
const BOOKING_MIN_HOURS_AHEAD = 24;
const TOUR_DURATION_MINUTES = 30;
const TOUR_CONFLICT_WINDOW_MINUTES = 30;

// ==================== TYPES ====================

export interface CancelBookingParams {
  bookingId: string;
  userId: string;
  reason?: string;
}

export interface CancelSeriesParams {
  seriesId: string;
  userId: string;
  reason?: string;
}

export interface RescheduleBookingParams {
  bookingId: string;
  userId: string;
  newScheduledAt: Date;
}

export interface CreateTourBookingParams {
  patientId: string;
  daycareId: string;
  childId: string;
  scheduledAt: Date;
  notes?: string;
  recurrence?: RecurrencePattern;
  recurrenceEndDate?: Date;
}

// ==================== VALIDATION HELPERS ====================

/**
 * Check if a booking can be cancelled based on the 24-hour policy.
 */
export function canCancelBooking(scheduledAt: Date | null): { canCancel: boolean; hoursRemaining?: number } {
  if (!scheduledAt) {
    return { canCancel: true };
  }

  const hoursUntilBooking = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilBooking < CANCELLATION_HOURS_AHEAD) {
    return { canCancel: false, hoursRemaining: Math.ceil(hoursUntilBooking) };
  }

  return { canCancel: true };
}

/**
 * Check if a date is at least 24 hours in the future.
 */
export function isValidBookingTime(scheduledAt: Date): boolean {
  const minTime = new Date(Date.now() + BOOKING_MIN_HOURS_AHEAD * 60 * 60 * 1000);
  return scheduledAt >= minTime;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Cancel a single booking.
 * Validates ownership and cancellation policy.
 */
export async function cancelBookingService({
  bookingId,
  userId,
  reason,
}: CancelBookingParams): Promise<{ success: true } | { success: false; error: string }> {
  // Verify ownership and status
  const booking = await db.appointment.findFirst({
    where: {
      id: bookingId,
      patientId: userId,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (!booking) {
    return { success: false, error: "Booking not found or cannot be cancelled" };
  }

  // Check cancellation policy
  const { canCancel, hoursRemaining } = canCancelBooking(booking.scheduledAt);
  if (!canCancel) {
    return {
      success: false,
      error: `Cancellations must be made at least ${CANCELLATION_HOURS_AHEAD} hours in advance. Only ${hoursRemaining} hours remaining.`,
    };
  }

  // Perform cancellation
  await db.appointment.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Cancelled by parent",
    },
  });

  return { success: true };
}

/**
 * Cancel all future bookings in a series.
 */
export async function cancelBookingSeriesService({
  seriesId,
  userId,
  reason,
}: CancelSeriesParams): Promise<{ success: true; cancelledCount: number } | { success: false; error: string }> {
  // Get all bookings in series
  const bookings = await db.appointment.findMany({
    where: {
      seriesId,
      patientId: userId,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (bookings.length === 0) {
    return { success: false, error: "No bookings found in this series" };
  }

  // Check cancellation policy for all future bookings
  const now = Date.now();
  const futureBookings = bookings.filter(
    (b) => b.scheduledAt && b.scheduledAt.getTime() > now
  );

  for (const booking of futureBookings) {
    const { canCancel } = canCancelBooking(booking.scheduledAt);
    if (!canCancel) {
      return {
        success: false,
        error: `Cannot cancel booking on ${booking.scheduledAt?.toLocaleDateString()} - less than ${CANCELLATION_HOURS_AHEAD} hours away`,
      };
    }
  }

  // Cancel all future bookings
  await db.appointment.updateMany({
    where: {
      seriesId,
      patientId: userId,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gt: new Date() },
    },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || "Series cancelled by parent",
    },
  });

  return { success: true, cancelledCount: futureBookings.length };
}

/**
 * Reschedule a booking to a new time.
 */
export async function rescheduleBookingService({
  bookingId,
  userId,
  newScheduledAt,
}: RescheduleBookingParams): Promise<{ success: true } | { success: false; error: string }> {
  // Verify ownership and status
  const booking = await db.appointment.findFirst({
    where: {
      id: bookingId,
      patientId: userId,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (!booking) {
    return { success: false, error: "Booking not found or cannot be rescheduled" };
  }

  // Verify new time is valid
  if (!isValidBookingTime(newScheduledAt)) {
    return {
      success: false,
      error: `Please select a time at least ${BOOKING_MIN_HOURS_AHEAD} hours in advance`,
    };
  }

  // Check for conflicts
  const hasConflict = await checkTimeSlotConflict(
    booking.daycareId,
    newScheduledAt,
    bookingId
  );

  if (hasConflict) {
    return { success: false, error: "This time slot is no longer available" };
  }

  // Update booking
  await db.appointment.update({
    where: { id: bookingId },
    data: {
      scheduledAt: newScheduledAt,
      status: BookingStatus.PENDING,
      notes: booking.notes
        ? `${booking.notes}\n\nRescheduled from ${booking.scheduledAt?.toISOString()}`
        : `Rescheduled from ${booking.scheduledAt?.toISOString()}`,
    },
  });

  return { success: true };
}

/**
 * Check if a time slot has a conflict.
 */
export async function checkTimeSlotConflict(
  daycareId: string,
  scheduledAt: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflictingBooking = await db.appointment.findFirst({
    where: {
      daycareId,
      type: BookingType.TOUR,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
      scheduledAt: {
        gte: new Date(scheduledAt.getTime() - TOUR_CONFLICT_WINDOW_MINUTES * 60 * 1000),
        lt: new Date(scheduledAt.getTime() + TOUR_CONFLICT_WINDOW_MINUTES * 60 * 1000),
      },
    },
  });

  return !!conflictingBooking;
}

/**
 * Create a tour booking (single or recurring).
 */
export async function createTourBookingService({
  patientId,
  daycareId,
  childId,
  scheduledAt,
  notes,
  recurrence = "NONE",
  recurrenceEndDate,
}: CreateTourBookingParams): Promise<
  { success: true; bookingIds: string[]; seriesId?: string } | { success: false; error: string }
> {
  // Verify child belongs to parent
  const child = await db.familyMember.findFirst({
    where: { id: childId, patientId },
  });

  if (!child) {
    return { success: false, error: "Child not found" };
  }

  // Verify daycare is approved
  const daycare = await db.provider.findUnique({
    where: {
      id: daycareId,
      status: DaycareStatus.APPROVED,
      deletedAt: null,
    },
  });

  if (!daycare) {
    return { success: false, error: "Daycare not found or not available" };
  }

  // Verify time is valid
  if (!isValidBookingTime(scheduledAt)) {
    return {
      success: false,
      error: `Please select a time at least ${BOOKING_MIN_HOURS_AHEAD} hours in advance`,
    };
  }

  // Generate booking dates
  const isRecurring = recurrence !== "NONE";
  let bookingDates: Date[] = [scheduledAt];
  let seriesId: string | undefined;

  if (isRecurring) {
    const endDate = recurrenceEndDate || getDefaultRecurrenceEndDate(scheduledAt);
    bookingDates = generateRecurringDates({
      pattern: recurrence,
      startDate: scheduledAt,
      endDate,
    });
    seriesId = generateSeriesId();
  }

  // Check for conflicts with ALL dates
  for (const date of bookingDates) {
    const hasConflict = await checkTimeSlotConflict(daycareId, date);
    if (hasConflict) {
      return {
        success: false,
        error: isRecurring
          ? `Time slot on ${date.toLocaleDateString()} is not available. Please choose a different time.`
          : "This time slot is no longer available",
      };
    }
  }

  // Create all bookings in transaction
  const bookings = await db.$transaction(
    bookingDates.map((date) =>
      db.appointment.create({
        data: {
          patientId,
          daycareId,
          childId,
          type: BookingType.TOUR,
          status: BookingStatus.PENDING,
          scheduledAt: date,
          duration: TOUR_DURATION_MINUTES,
          notes: notes || null,
          recurrence: recurrence,
          recurrenceEndDate: isRecurring ? bookingDates[bookingDates.length - 1] : null,
          seriesId: seriesId || null,
        },
      })
    )
  );

  return {
    success: true,
    bookingIds: bookings.map((b) => b.id),
    seriesId,
  };
}

/**
 * Get available booking slots for a daycare.
 */
export async function getAvailableSlotsService(
  daycareId: string,
  options?: { startDate?: Date; endDate?: Date; daysAhead?: number }
): Promise<DayAvailability[]> {
  const daycare = await db.provider.findUnique({
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

  const now = new Date();
  const start = options?.startDate || now;
  const daysAhead = options?.daysAhead || 14;
  const end = options?.endDate || new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Get existing bookings
  const existingBookings = await db.appointment.findMany({
    where: {
      daycareId,
      type: BookingType.TOUR,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      scheduledAt: { gte: start, lte: end },
    },
    select: {
      scheduledAt: true,
      duration: true,
      status: true,
    },
  });

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
    TOUR_DURATION_MINUTES
  );
}
