/**
 * Centralized validation schemas.
 *
 * Export all validators from this file for easy imports:
 * import { tourBookingSchema, emailSchema } from "@/server/validators";
 */

// Common primitives
export {
  // IDs
  cuidSchema,
  optionalCuidSchema,
  uuidSchema,
  // Strings
  nonEmptyStringSchema,
  emailSchema,
  phoneSchema,
  // Dates
  datetimeSchema,
  dateSchema,
  futureDateSchema,
  // Numbers
  positiveIntSchema,
  nonNegativeIntSchema,
  pageSchema,
  pageSizeSchema,
  // Boolean
  booleanStringSchema,
  // Helpers
  createEnumSchema,
  // Composite
  paginationSchema,
  sortDirectionSchema,
  createSortSchema,
} from "./common";

export type { PaginationParams } from "./common";

// Booking schemas
export {
  recurrencePatternSchema,
  tourBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  cancelSeriesSchema,
  enrollmentScheduleSchema,
  enrollmentRequestSchema,
  bookingFilterSchema,
  availableSlotsQuerySchema,
} from "./booking.schema";

export type {
  RecurrencePattern,
  TourBookingInput,
  RescheduleInput,
  CancelBookingInput,
  CancelSeriesInput,
  EnrollmentInput,
  BookingFilter,
  AvailableSlotsQuery,
} from "./booking.schema";
