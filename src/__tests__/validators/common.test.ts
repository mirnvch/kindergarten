/**
 * Unit tests for common validation schemas.
 */

import { describe, it, expect } from "vitest";
import {
  cuidSchema,
  emailSchema,
  phoneSchema,
  datetimeSchema,
  pageSchema,
  pageSizeSchema,
  paginationSchema,
  booleanStringSchema,
} from "@/server/validators";

describe("Common Validation Schemas", () => {
  describe("cuidSchema", () => {
    it("should accept valid CUIDs", () => {
      // Valid CUID format
      expect(cuidSchema.parse("clq1234567890abcdef")).toBe("clq1234567890abcdef");
      expect(cuidSchema.parse("cm1abcdefghijklmno")).toBe("cm1abcdefghijklmno");
    });

    it("should reject invalid CUIDs", () => {
      expect(() => cuidSchema.parse("")).toThrow();
      expect(() => cuidSchema.parse("invalid")).toThrow();
      expect(() => cuidSchema.parse("123")).toThrow();
    });
  });

  describe("emailSchema", () => {
    it("should accept valid emails", () => {
      expect(emailSchema.parse("test@example.com")).toBe("test@example.com");
      expect(emailSchema.parse("user.name@domain.org")).toBe("user.name@domain.org");
    });

    it("should normalize emails to lowercase", () => {
      expect(emailSchema.parse("Test@EXAMPLE.com")).toBe("test@example.com");
    });

    it("should reject emails with leading/trailing whitespace (Zod validates before transform)", () => {
      // Zod validates format before applying transform, so whitespace fails validation
      expect(() => emailSchema.parse("  test@example.com  ")).toThrow();
    });

    it("should reject invalid emails", () => {
      expect(() => emailSchema.parse("invalid")).toThrow();
      expect(() => emailSchema.parse("@example.com")).toThrow();
      expect(() => emailSchema.parse("test@")).toThrow();
    });

    it("should reject emails that are too long", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(() => emailSchema.parse(longEmail)).toThrow();
    });
  });

  describe("phoneSchema", () => {
    it("should accept valid phone numbers", () => {
      expect(phoneSchema.parse("1234567890")).toBe("1234567890");
      expect(phoneSchema.parse("+1 (555) 123-4567")).toBe("+1 (555) 123-4567");
      expect(phoneSchema.parse("555-123-4567")).toBe("555-123-4567");
    });

    it("should accept undefined (optional)", () => {
      expect(phoneSchema.parse(undefined)).toBeUndefined();
    });

    it("should reject invalid phone numbers", () => {
      expect(() => phoneSchema.parse("abc")).toThrow();
      expect(() => phoneSchema.parse("123")).toThrow(); // Too short
    });
  });

  describe("datetimeSchema", () => {
    it("should accept valid ISO datetime strings", () => {
      expect(datetimeSchema.parse("2025-06-15T10:00:00.000Z")).toBe("2025-06-15T10:00:00.000Z");
      expect(datetimeSchema.parse("2025-01-01T00:00:00Z")).toBe("2025-01-01T00:00:00Z");
    });

    it("should reject invalid datetime strings", () => {
      expect(() => datetimeSchema.parse("not-a-date")).toThrow();
      expect(() => datetimeSchema.parse("2025-06-15")).toThrow(); // Missing time
      expect(() => datetimeSchema.parse("")).toThrow();
    });
  });

  describe("pageSchema", () => {
    it("should accept valid page numbers", () => {
      expect(pageSchema.parse(1)).toBe(1);
      expect(pageSchema.parse(10)).toBe(10);
      expect(pageSchema.parse("5")).toBe(5); // Coerced from string
    });

    it("should default to 1", () => {
      expect(pageSchema.parse(undefined)).toBe(1);
    });

    it("should reject invalid page numbers", () => {
      expect(() => pageSchema.parse(0)).toThrow();
      expect(() => pageSchema.parse(-1)).toThrow();
    });
  });

  describe("pageSizeSchema", () => {
    it("should accept valid page sizes", () => {
      expect(pageSizeSchema.parse(10)).toBe(10);
      expect(pageSizeSchema.parse(50)).toBe(50);
      expect(pageSizeSchema.parse(100)).toBe(100);
    });

    it("should default to 20", () => {
      expect(pageSizeSchema.parse(undefined)).toBe(20);
    });

    it("should reject page sizes that are too large", () => {
      expect(() => pageSizeSchema.parse(101)).toThrow();
    });

    it("should reject invalid page sizes", () => {
      expect(() => pageSizeSchema.parse(0)).toThrow();
      expect(() => pageSizeSchema.parse(-1)).toThrow();
    });
  });

  describe("paginationSchema", () => {
    it("should accept valid pagination params", () => {
      const result = paginationSchema.parse({ page: 2, pageSize: 50 });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it("should apply defaults for missing params", () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe("booleanStringSchema", () => {
    it("should transform 'true' to true", () => {
      expect(booleanStringSchema.parse("true")).toBe(true);
    });

    it("should transform 'false' to false", () => {
      expect(booleanStringSchema.parse("false")).toBe(false);
    });

    it("should reject other values", () => {
      expect(() => booleanStringSchema.parse("yes")).toThrow();
      expect(() => booleanStringSchema.parse("1")).toThrow();
      expect(() => booleanStringSchema.parse("")).toThrow();
    });
  });
});
