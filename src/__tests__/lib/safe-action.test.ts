/**
 * Unit tests for createSafeAction wrapper.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ErrorCode } from "@/lib/errors";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === "x-forwarded-for") return "127.0.0.1";
      return null;
    }),
  })),
}));

import { createSafeAction, requireRole, requireAdmin } from "@/lib/safe-action";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

describe("createSafeAction", () => {
  const mockAuth = auth as ReturnType<typeof vi.fn>;
  const mockRateLimit = rateLimit as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true, remaining: 10, reset: Date.now() + 60000 });
  });

  const testSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  describe("authentication", () => {
    it("should return unauthorized error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const action = createSafeAction(testSchema, async (data) => data);

      const result = await action({ name: "Test", email: "test@example.com" });

      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it("should pass context with user info when authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          email: "test@example.com",
          role: "PATIENT",
        },
      });

      let capturedCtx: unknown;
      const action = createSafeAction(testSchema, async (data, ctx) => {
        capturedCtx = ctx;
        return data;
      });

      await action({ name: "Test", email: "test@example.com" });

      expect(capturedCtx).toMatchObject({
        userId: "user-123",
        email: "test@example.com",
        role: "PATIENT",
      });
    });

    it("should allow unauthenticated access with requireAuth: false", async () => {
      mockAuth.mockResolvedValue(null);

      const action = createSafeAction(testSchema, async (data) => data, { requireAuth: false });

      const result = await action({ name: "Test", email: "test@example.com" });

      expect(result.success).toBe(true);
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "PATIENT" },
      });
    });

    it("should validate input against schema", async () => {
      const action = createSafeAction(testSchema, async (data) => data);

      const result = await action({ name: "", email: "invalid" });

      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it("should pass validated data to handler", async () => {
      let receivedData: unknown;
      const action = createSafeAction(testSchema, async (data) => {
        receivedData = data;
        return data;
      });

      await action({ name: "Test User", email: "test@example.com" });

      expect(receivedData).toEqual({
        name: "Test User",
        email: "test@example.com",
      });
    });
  });

  describe("rate limiting", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "PATIENT" },
      });
    });

    it("should check rate limit when configured", async () => {
      const action = createSafeAction(testSchema, async (data) => data, { rateLimit: "api" });

      await action({ name: "Test", email: "test@example.com" });

      expect(mockRateLimit).toHaveBeenCalledWith("user-123", "api");
    });

    it("should return rate limit error when exceeded", async () => {
      mockRateLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const action = createSafeAction(testSchema, async (data) => data, { rateLimit: "api" });

      const result = await action({ name: "Test", email: "test@example.com" });

      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.RATE_LIMITED);
    });

    it("should use custom rate limit key", async () => {
      const action = createSafeAction(testSchema, async (data) => data, {
        rateLimit: "api",
        rateLimitKey: (ctx) => `custom-${ctx.email}`,
      });

      await action({ name: "Test", email: "test@example.com" });

      expect(mockRateLimit).toHaveBeenCalledWith("custom-test@example.com", "api");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com", role: "PATIENT" },
      });
    });

    it("should catch and convert handler errors", async () => {
      const action = createSafeAction(testSchema, async () => {
        throw new Error("Handler error");
      });

      const result = await action({ name: "Test", email: "test@example.com" });

      expect(result.success).toBe(false);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it("should return success result on successful execution", async () => {
      const action = createSafeAction(testSchema, async (data) => ({ id: "123", ...data }));

      const result = await action({ name: "Test", email: "test@example.com" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: "123",
        name: "Test",
        email: "test@example.com",
      });
    });
  });
});

describe("middleware helpers", () => {
  describe("requireRole", () => {
    it("should not throw for allowed role", () => {
      const middleware = requireRole("ADMIN", "PROVIDER");
      const ctx = { userId: "123", role: "ADMIN", email: "", ip: "" };

      expect(() => middleware(ctx)).not.toThrow();
    });

    it("should throw for disallowed role", () => {
      const middleware = requireRole("ADMIN");
      const ctx = { userId: "123", role: "PATIENT", email: "", ip: "" };

      expect(() => middleware(ctx)).toThrow();
    });
  });

  describe("requireAdmin", () => {
    it("should not throw for admin", () => {
      const middleware = requireAdmin();
      const ctx = { userId: "123", role: "ADMIN", email: "", ip: "" };

      expect(() => middleware(ctx)).not.toThrow();
    });

    it("should throw for non-admin", () => {
      const middleware = requireAdmin();
      const ctx = { userId: "123", role: "PATIENT", email: "", ip: "" };

      expect(() => middleware(ctx)).toThrow();
    });
  });
});
