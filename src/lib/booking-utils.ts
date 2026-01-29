// Booking utilities for generating available time slots

export interface TimeSlot {
  time: string; // "09:00"
  datetime: Date;
  available: boolean;
}

export interface DayAvailability {
  date: Date;
  dateString: string; // "2024-01-15"
  dayOfWeek: number; // 0-6
  dayName: string; // "Mon", "Tue", etc.
  isOpen: boolean;
  slots: TimeSlot[];
}

interface DaycareScheduleInfo {
  openingTime: string; // "07:00"
  closingTime: string; // "18:00"
  operatingDays: string[]; // ["Mon", "Tue", ...]
}

interface ExistingBooking {
  scheduledAt: Date | null;
  duration: number | null;
  status: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Parse time string "HH:MM" to hours and minutes
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Format hours and minutes to "HH:MM"
 */
function formatTimeString(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Check if a date is at least 24 hours from now
 */
function isAtLeast24HoursAhead(date: Date): boolean {
  const now = new Date();
  const minTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return date >= minTime;
}

/**
 * Check if a slot conflicts with existing bookings
 */
function hasConflict(
  slotStart: Date,
  slotDuration: number,
  existingBookings: ExistingBooking[]
): boolean {
  const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

  for (const booking of existingBookings) {
    if (!booking.scheduledAt) continue;
    if (booking.status === "CANCELLED" || booking.status === "NO_SHOW") continue;

    const bookingStart = new Date(booking.scheduledAt);
    const bookingDuration = booking.duration || 30;
    const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60 * 1000);

    // Check for overlap
    if (slotStart < bookingEnd && slotEnd > bookingStart) {
      return true;
    }
  }

  return false;
}

/**
 * Generate available time slots for a daycare
 *
 * @param daycare - Daycare schedule information
 * @param existingBookings - Array of existing bookings to check conflicts
 * @param daysAhead - Number of days ahead to generate slots (default: 14)
 * @param slotDuration - Duration of each slot in minutes (default: 30)
 * @returns Array of DayAvailability objects
 */
export function generateAvailableSlots(
  daycare: DaycareScheduleInfo,
  existingBookings: ExistingBooking[],
  daysAhead: number = 14,
  slotDuration: number = 30
): DayAvailability[] {
  const result: DayAvailability[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const opening = parseTime(daycare.openingTime);
  const closing = parseTime(daycare.closingTime);

  // Last slot should end 1 hour before closing to allow for tour duration
  const lastSlotHour = closing.hours - 1;
  const lastSlotMinute = closing.minutes;

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);

    const dayOfWeek = date.getDay();
    const dayName = DAY_NAMES[dayOfWeek];
    const isOpen = daycare.operatingDays.includes(dayName);

    const dateString = date.toISOString().split("T")[0];

    const dayAvailability: DayAvailability = {
      date: new Date(date),
      dateString,
      dayOfWeek,
      dayName,
      isOpen,
      slots: [],
    };

    if (isOpen) {
      // Generate slots from opening time to last slot time
      let currentHour = opening.hours;
      let currentMinute = opening.minutes;

      while (
        currentHour < lastSlotHour ||
        (currentHour === lastSlotHour && currentMinute <= lastSlotMinute)
      ) {
        const slotTime = formatTimeString(currentHour, currentMinute);
        const slotDatetime = new Date(date);
        slotDatetime.setHours(currentHour, currentMinute, 0, 0);

        // Check availability
        const is24HoursAhead = isAtLeast24HoursAhead(slotDatetime);
        const hasBookingConflict = hasConflict(slotDatetime, slotDuration, existingBookings);
        const available = is24HoursAhead && !hasBookingConflict;

        dayAvailability.slots.push({
          time: slotTime,
          datetime: slotDatetime,
          available,
        });

        // Move to next slot
        currentMinute += slotDuration;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
      }
    }

    result.push(dayAvailability);
  }

  return result;
}

/**
 * Get slots for a specific date from availability array
 */
export function getSlotsForDate(
  availability: DayAvailability[],
  dateString: string
): TimeSlot[] {
  const day = availability.find((d) => d.dateString === dateString);
  return day?.slots || [];
}

/**
 * Check if a specific datetime is available
 */
export function isSlotAvailable(
  availability: DayAvailability[],
  datetime: Date
): boolean {
  const dateString = datetime.toISOString().split("T")[0];
  const timeString = formatTimeString(datetime.getHours(), datetime.getMinutes());

  const day = availability.find((d) => d.dateString === dateString);
  if (!day) return false;

  const slot = day.slots.find((s) => s.time === timeString);
  return slot?.available || false;
}

/**
 * Format a date for display (e.g., "Mon, Jan 15")
 */
export function formatDateForPicker(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format time for display (e.g., "9:00 AM")
 */
export function formatTimeForDisplay(time: string): string {
  const { hours, minutes } = parseTime(time);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Get the number of available slots for a day
 */
export function getAvailableSlotsCount(day: DayAvailability): number {
  return day.slots.filter((s) => s.available).length;
}
