/**
 * Unit tests for booking service.
 *
 * Tests the pure business logic functions.
 * Database operations are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canCancelBooking,
  isValidBookingTime,
} from "@/server/services/booking.service";

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    child: {
      findFirst: vi.fn(),
    },
    daycare: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Booking Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset time mocks
    vi.useRealTimers();
  });

  describe("canCancelBooking", () => {
    it("should allow cancellation when scheduledAt is null", () => {
      const result = canCancelBooking(null);
      expect(result.canCancel).toBe(true);
    });

    it("should allow cancellation when more than 24 hours ahead", () => {
      // Set scheduledAt to 48 hours from now
      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const result = canCancelBooking(scheduledAt);

      expect(result.canCancel).toBe(true);
      expect(result.hoursRemaining).toBeUndefined();
    });

    it("should allow cancellation when exactly 24 hours ahead", () => {
      // Set scheduledAt to exactly 24 hours from now
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = canCancelBooking(scheduledAt);

      expect(result.canCancel).toBe(true);
    });

    it("should NOT allow cancellation when less than 24 hours ahead", () => {
      // Set scheduledAt to 12 hours from now
      const scheduledAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const result = canCancelBooking(scheduledAt);

      expect(result.canCancel).toBe(false);
      expect(result.hoursRemaining).toBe(12);
    });

    it("should NOT allow cancellation when only 1 hour ahead", () => {
      const scheduledAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
      const result = canCancelBooking(scheduledAt);

      expect(result.canCancel).toBe(false);
      expect(result.hoursRemaining).toBe(1);
    });

    it("should NOT allow cancellation when booking is in the past", () => {
      const scheduledAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const result = canCancelBooking(scheduledAt);

      expect(result.canCancel).toBe(false);
      // hoursRemaining would be negative, but we ceil it
      expect(result.hoursRemaining).toBeLessThanOrEqual(0);
    });
  });

  describe("isValidBookingTime", () => {
    it("should return true for times more than 24 hours ahead", () => {
      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      expect(isValidBookingTime(scheduledAt)).toBe(true);
    });

    it("should return true for times exactly 24 hours ahead", () => {
      // Adding a small buffer for test execution time
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000 + 1000);
      expect(isValidBookingTime(scheduledAt)).toBe(true);
    });

    it("should return false for times less than 24 hours ahead", () => {
      const scheduledAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      expect(isValidBookingTime(scheduledAt)).toBe(false);
    });

    it("should return false for past times", () => {
      const scheduledAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
      expect(isValidBookingTime(scheduledAt)).toBe(false);
    });

    it("should return false for current time", () => {
      const scheduledAt = new Date();
      expect(isValidBookingTime(scheduledAt)).toBe(false);
    });
  });
});
