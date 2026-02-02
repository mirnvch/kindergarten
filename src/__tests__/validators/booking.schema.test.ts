/**
 * Unit tests for booking validation schemas.
 */

import { describe, it, expect } from "vitest";
import {
  tourBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  recurrencePatternSchema,
  bookingFilterSchema,
} from "@/server/validators";

describe("Booking Validation Schemas", () => {
  describe("recurrencePatternSchema", () => {
    it("should accept valid patterns", () => {
      expect(recurrencePatternSchema.parse("NONE")).toBe("NONE");
      expect(recurrencePatternSchema.parse("WEEKLY")).toBe("WEEKLY");
      expect(recurrencePatternSchema.parse("BIWEEKLY")).toBe("BIWEEKLY");
      expect(recurrencePatternSchema.parse("MONTHLY")).toBe("MONTHLY");
    });

    it("should default to NONE if undefined", () => {
      expect(recurrencePatternSchema.parse(undefined)).toBe("NONE");
    });

    it("should reject invalid patterns", () => {
      expect(() => recurrencePatternSchema.parse("DAILY")).toThrow();
      expect(() => recurrencePatternSchema.parse("invalid")).toThrow();
    });
  });

  describe("bookingFilterSchema", () => {
    it("should accept valid filters", () => {
      expect(bookingFilterSchema.parse("upcoming")).toBe("upcoming");
      expect(bookingFilterSchema.parse("past")).toBe("past");
    });

    it("should default to upcoming if undefined", () => {
      expect(bookingFilterSchema.parse(undefined)).toBe("upcoming");
    });

    it("should reject invalid filters", () => {
      expect(() => bookingFilterSchema.parse("all")).toThrow();
      expect(() => bookingFilterSchema.parse("invalid")).toThrow();
    });
  });

  describe("tourBookingSchema", () => {
    const validInput = {
      daycareId: "clq1234567890abcdef",
      childId: "clq0987654321fedcba",
      scheduledAt: "2025-06-15T10:00:00.000Z",
    };

    it("should accept valid tour booking input", () => {
      const result = tourBookingSchema.parse(validInput);
      expect(result.daycareId).toBe(validInput.daycareId);
      expect(result.childId).toBe(validInput.childId);
      expect(result.scheduledAt).toBe(validInput.scheduledAt);
      expect(result.recurrence).toBe("NONE");
    });

    it("should accept optional notes", () => {
      const result = tourBookingSchema.parse({
        ...validInput,
        notes: "Special requirements",
      });
      expect(result.notes).toBe("Special requirements");
    });

    it("should accept recurrence pattern", () => {
      const result = tourBookingSchema.parse({
        ...validInput,
        recurrence: "WEEKLY",
        recurrenceEndDate: "2025-07-15T10:00:00.000Z",
      });
      expect(result.recurrence).toBe("WEEKLY");
    });

    it("should reject invalid daycareId", () => {
      expect(() =>
        tourBookingSchema.parse({
          ...validInput,
          daycareId: "invalid-id",
        })
      ).toThrow();
    });

    it("should reject invalid childId", () => {
      expect(() =>
        tourBookingSchema.parse({
          ...validInput,
          childId: "",
        })
      ).toThrow();
    });

    it("should reject invalid scheduledAt", () => {
      expect(() =>
        tourBookingSchema.parse({
          ...validInput,
          scheduledAt: "not-a-date",
        })
      ).toThrow();
    });

    it("should reject notes that are too long", () => {
      expect(() =>
        tourBookingSchema.parse({
          ...validInput,
          notes: "x".repeat(1001),
        })
      ).toThrow();
    });
  });

  describe("rescheduleBookingSchema", () => {
    it("should accept valid reschedule input", () => {
      const result = rescheduleBookingSchema.parse({
        bookingId: "clq1234567890abcdef",
        newScheduledAt: "2025-06-20T14:00:00.000Z",
      });
      expect(result.bookingId).toBe("clq1234567890abcdef");
      expect(result.newScheduledAt).toBe("2025-06-20T14:00:00.000Z");
    });

    it("should reject invalid bookingId", () => {
      expect(() =>
        rescheduleBookingSchema.parse({
          bookingId: "invalid",
          newScheduledAt: "2025-06-20T14:00:00.000Z",
        })
      ).toThrow();
    });

    it("should reject invalid newScheduledAt", () => {
      expect(() =>
        rescheduleBookingSchema.parse({
          bookingId: "clq1234567890abcdef",
          newScheduledAt: "invalid-date",
        })
      ).toThrow();
    });
  });

  describe("cancelBookingSchema", () => {
    it("should accept valid cancel input", () => {
      const result = cancelBookingSchema.parse({
        bookingId: "clq1234567890abcdef",
      });
      expect(result.bookingId).toBe("clq1234567890abcdef");
      expect(result.reason).toBeUndefined();
    });

    it("should accept optional reason", () => {
      const result = cancelBookingSchema.parse({
        bookingId: "clq1234567890abcdef",
        reason: "Schedule conflict",
      });
      expect(result.reason).toBe("Schedule conflict");
    });

    it("should reject reason that is too long", () => {
      expect(() =>
        cancelBookingSchema.parse({
          bookingId: "clq1234567890abcdef",
          reason: "x".repeat(501),
        })
      ).toThrow();
    });
  });
});
