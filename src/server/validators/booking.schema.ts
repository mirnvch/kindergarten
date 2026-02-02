/**
 * Booking-related validation schemas.
 */

import { z } from "zod";
import { cuidSchema, datetimeSchema, nonEmptyStringSchema } from "./common";

// ==================== RECURRENCE ====================

export const recurrencePatternSchema = z
  .enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"])
  .default("NONE");

export type RecurrencePattern = z.infer<typeof recurrencePatternSchema>;

// ==================== TOUR BOOKING ====================

export const tourBookingSchema = z.object({
  daycareId: cuidSchema.describe("Daycare is required"),
  childId: cuidSchema.describe("Please select a child"),
  scheduledAt: datetimeSchema.describe("Invalid date/time"),
  notes: z.string().max(1000, "Notes are too long").optional(),
  recurrence: recurrencePatternSchema,
  recurrenceEndDate: datetimeSchema.optional(),
});

export type TourBookingInput = z.infer<typeof tourBookingSchema>;

// ==================== RESCHEDULE ====================

export const rescheduleBookingSchema = z.object({
  bookingId: cuidSchema.describe("Booking ID is required"),
  newScheduledAt: datetimeSchema.describe("Invalid date/time"),
});

export type RescheduleInput = z.infer<typeof rescheduleBookingSchema>;

// ==================== CANCEL ====================

export const cancelBookingSchema = z.object({
  bookingId: cuidSchema.describe("Booking ID is required"),
  reason: z.string().max(500, "Reason is too long").optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const cancelSeriesSchema = z.object({
  seriesId: nonEmptyStringSchema.describe("Series ID is required"),
  reason: z.string().max(500, "Reason is too long").optional(),
});

export type CancelSeriesInput = z.infer<typeof cancelSeriesSchema>;

// ==================== ENROLLMENT ====================

export const enrollmentScheduleSchema = z.enum([
  "full-time",
  "part-time",
  "before-after",
]);

export const enrollmentRequestSchema = z.object({
  daycareId: cuidSchema.describe("Daycare is required"),
  childId: cuidSchema.describe("Please select a child"),
  programId: cuidSchema.optional(),
  schedule: enrollmentScheduleSchema.describe("Please select a schedule"),
  desiredStartDate: nonEmptyStringSchema.describe("Please select a start date"),
  notes: z.string().max(1000, "Notes are too long").optional(),
});

export type EnrollmentInput = z.infer<typeof enrollmentRequestSchema>;

// ==================== BOOKING FILTERS ====================

export const bookingFilterSchema = z.enum(["upcoming", "past"]).default("upcoming");

export type BookingFilter = z.infer<typeof bookingFilterSchema>;

// ==================== SLOT QUERY ====================

export const availableSlotsQuerySchema = z.object({
  daycareId: cuidSchema,
  startDate: datetimeSchema.optional(),
  endDate: datetimeSchema.optional(),
  daysAhead: z.coerce.number().int().min(1).max(60).default(14),
});

export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;
