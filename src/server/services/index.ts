/**
 * Service layer - Pure business logic.
 *
 * Services contain clean business logic without:
 * - Authentication (handled by actions)
 * - Rate limiting (handled by actions)
 * - Cache revalidation (handled by actions)
 * - Redirects (handled by actions)
 *
 * This separation enables easy unit testing and reuse.
 */

export {
  // Booking service
  cancelBookingService,
  cancelBookingSeriesService,
  rescheduleBookingService,
  createTourBookingService,
  getAvailableSlotsService,
  // Helpers
  canCancelBooking,
  isValidBookingTime,
  checkTimeSlotConflict,
} from "./booking.service";

export type {
  CancelBookingParams,
  CancelSeriesParams,
  RescheduleBookingParams,
  CreateTourBookingParams,
} from "./booking.service";
