/**
 * Unit tests for the error system.
 */

import { describe, it, expect } from "vitest";
import { ZodError, z } from "zod";
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  AlreadyExistsError,
  ErrorCode,
  toActionResult,
  isAppError,
  hasErrorCode,
  assertExists,
  getErrorMessage,
} from "@/lib/errors";

describe("Error System", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // AppError Base Class
  // ─────────────────────────────────────────────────────────────────────────

  describe("AppError", () => {
    it("should create error with correct properties", () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, "Something went wrong", {
        context: "test",
      });

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ context: "test" });
      expect(error.isOperational).toBe(true);
    });

    it("should use default status code from ErrorStatusCodes", () => {
      const error = new AppError(ErrorCode.NOT_FOUND, "Not found");
      expect(error.statusCode).toBe(404);
    });

    it("should allow custom status code override", () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, "Custom status", undefined, 422);
      expect(error.statusCode).toBe(422);
    });

    it("should serialize to JSON correctly", () => {
      const error = new AppError(ErrorCode.FORBIDDEN, "Access denied", { resource: "admin" });

      const json = error.toJSON();

      expect(json).toEqual({
        name: "AppError",
        code: ErrorCode.FORBIDDEN,
        message: "Access denied",
        statusCode: 403,
        details: { resource: "admin" },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Specific Error Classes
  // ─────────────────────────────────────────────────────────────────────────

  describe("ValidationError", () => {
    it("should create with message and field errors", () => {
      const error = new ValidationError("Invalid input", {
        email: ["Invalid email format"],
        password: ["Too short", "Must contain number"],
      });

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.fieldErrors).toEqual({
        email: ["Invalid email format"],
        password: ["Too short", "Must contain number"],
      });
    });

    it("should create from ZodError", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      try {
        schema.parse({ email: "invalid", age: 10 });
      } catch (e) {
        const error = ValidationError.fromZodError(e as ZodError);

        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.fieldErrors).toHaveProperty("email");
        expect(error.fieldErrors).toHaveProperty("age");
      }
    });
  });

  describe("NotFoundError", () => {
    it("should create with resource name", () => {
      const error = new NotFoundError("User");

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found");
    });

    it("should include identifier in message", () => {
      const error = new NotFoundError("User", "user-123");

      expect(error.message).toBe('User with id "user-123" not found');
      expect(error.details).toEqual({ resource: "User", identifier: "user-123" });
    });
  });

  describe("UnauthorizedError", () => {
    it("should have correct defaults", () => {
      const error = new UnauthorizedError();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Authentication required");
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedError("Please log in");
      expect(error.message).toBe("Please log in");
    });
  });

  describe("ForbiddenError", () => {
    it("should have correct defaults", () => {
      const error = new ForbiddenError();

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.statusCode).toBe(403);
    });
  });

  describe("RateLimitError", () => {
    it("should include retry after time", () => {
      const error = new RateLimitError(30);

      expect(error.code).toBe(ErrorCode.RATE_LIMITED);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(30);
      expect(error.message).toContain("30 seconds");
    });

    it("should handle no retry after", () => {
      const error = new RateLimitError();

      expect(error.retryAfter).toBeUndefined();
      expect(error.message).toBe("Too many requests. Please try again later.");
    });
  });

  describe("AlreadyExistsError", () => {
    it("should create with resource name", () => {
      const error = new AlreadyExistsError("User", "test@example.com");

      expect(error.code).toBe(ErrorCode.ALREADY_EXISTS);
      expect(error.statusCode).toBe(409);
      expect(error.message).toContain("test@example.com");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handler Functions
  // ─────────────────────────────────────────────────────────────────────────

  describe("toActionResult", () => {
    it("should convert AppError to ActionResult", () => {
      const error = new NotFoundError("User");
      const result = toActionResult(error);

      expect(result).toEqual({
        success: false,
        error: "User not found",
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("should convert ZodError to ActionResult", () => {
      const schema = z.object({ email: z.string().email() });

      try {
        schema.parse({ email: "invalid" });
      } catch (e) {
        const result = toActionResult(e);

        expect(result.success).toBe(false);
        expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
      }
    });

    it("should handle generic Error", () => {
      const error = new Error("Something broke");
      const result = toActionResult(error);

      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it("should handle unknown error types", () => {
      const result = toActionResult("string error");

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
        code: ErrorCode.INTERNAL_ERROR,
      });
    });
  });

  describe("isAppError", () => {
    it("should return true for AppError instances", () => {
      expect(isAppError(new AppError(ErrorCode.INTERNAL_ERROR, "test"))).toBe(true);
      expect(isAppError(new NotFoundError("User"))).toBe(true);
      expect(isAppError(new ValidationError("test"))).toBe(true);
    });

    it("should return false for non-AppError", () => {
      expect(isAppError(new Error("test"))).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError("string")).toBe(false);
      expect(isAppError({})).toBe(false);
    });
  });

  describe("hasErrorCode", () => {
    it("should return true for matching error code", () => {
      const error = new NotFoundError("User");
      expect(hasErrorCode(error, ErrorCode.NOT_FOUND)).toBe(true);
    });

    it("should return false for non-matching error code", () => {
      const error = new NotFoundError("User");
      expect(hasErrorCode(error, ErrorCode.UNAUTHORIZED)).toBe(false);
    });

    it("should return false for non-AppError", () => {
      expect(hasErrorCode(new Error("test"), ErrorCode.NOT_FOUND)).toBe(false);
    });
  });

  describe("assertExists", () => {
    it("should not throw for existing value", () => {
      const value = { id: "123" };
      expect(() => assertExists(value, "User")).not.toThrow();
    });

    it("should throw NotFoundError for null", () => {
      expect(() => assertExists(null, "User")).toThrow(NotFoundError);
    });

    it("should throw NotFoundError for undefined", () => {
      expect(() => assertExists(undefined, "User", "123")).toThrow(NotFoundError);
    });

    it("should include identifier in error", () => {
      try {
        assertExists(null, "User", "user-123");
      } catch (e) {
        expect((e as NotFoundError).message).toContain("user-123");
      }
    });
  });

  describe("getErrorMessage", () => {
    it("should return user-friendly message for each error code", () => {
      expect(getErrorMessage(ErrorCode.NOT_FOUND)).toBe("The requested item was not found");
      expect(getErrorMessage(ErrorCode.UNAUTHORIZED)).toBe("Please log in to continue");
      expect(getErrorMessage(ErrorCode.RATE_LIMITED)).toBe(
        "Too many requests. Please wait a moment."
      );
      expect(getErrorMessage(ErrorCode.VALIDATION_ERROR)).toBe(
        "Please check your input and try again"
      );
    });
  });
});
