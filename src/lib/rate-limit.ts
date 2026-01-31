import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client (lazy to avoid errors if env vars not set)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("[RateLimit] Upstash Redis not configured, rate limiting disabled");
    return null;
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return redis;
}

// Rate limiters for different actions
// Using sliding window algorithm for smooth rate limiting

export type RateLimitType =
  | "api"             // General API: 60/min
  | "auth"            // Auth attempts: 5/min
  | "booking"         // Booking creation: 10/min
  | "review"          // Review submission: 5/hour
  | "waitlist"        // Waitlist join: 10/hour
  | "bulk-message"    // Bulk messaging: 3/hour
  | "search"          // Search requests: 30/min
  | "message"         // Message sending: 30/min (prevents spam)
  | "thread"          // Thread creation: 10/min
  | "2fa-verify"      // 2FA verification: 5/min
  | "2fa-setup"       // 2FA setup: 3/hour
  | "data-export"     // Data export: 1/day
  | "account-delete"  // Account deletion: 3/hour
  // Admin actions (destructive operations)
  | "admin-delete-user"    // Delete user: 10/hour
  | "admin-delete-daycare" // Delete daycare: 10/hour
  | "admin-delete-review"  // Delete review: 20/hour
  | "admin-suspend"        // Suspend user/daycare: 20/hour
  | "admin-bulk"           // Bulk admin operations: 5/hour
  | "admin-moderate";      // Moderation actions: 50/hour

type Duration = `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d`;

const RATE_LIMITS: Record<RateLimitType, { requests: number; window: Duration }> = {
  "api":            { requests: 60,  window: "1 m" },
  "auth":           { requests: 5,   window: "1 m" },
  "booking":        { requests: 10,  window: "1 m" },
  "review":         { requests: 5,   window: "1 h" },
  "waitlist":       { requests: 10,  window: "1 h" },
  "bulk-message":   { requests: 3,   window: "1 h" },
  "search":         { requests: 30,  window: "1 m" },
  "message":        { requests: 30,  window: "1 m" },
  "thread":         { requests: 10,  window: "1 m" },
  "2fa-verify":     { requests: 5,   window: "1 m" },
  "2fa-setup":      { requests: 5,   window: "1 h" },
  "data-export":    { requests: 1,   window: "1 d" },
  "account-delete": { requests: 3,   window: "1 h" },
  // Admin actions
  "admin-delete-user":    { requests: 10, window: "1 h" },
  "admin-delete-daycare": { requests: 10, window: "1 h" },
  "admin-delete-review":  { requests: 20, window: "1 h" },
  "admin-suspend":        { requests: 20, window: "1 h" },
  "admin-bulk":           { requests: 5,  window: "1 h" },
  "admin-moderate":       { requests: 50, window: "1 h" },
};

// Cache rate limiters to avoid recreating them
const rateLimiters = new Map<RateLimitType, Ratelimit>();

function getRateLimiter(type: RateLimitType): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;

  if (rateLimiters.has(type)) {
    return rateLimiters.get(type)!;
  }

  const config = RATE_LIMITS[type];
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `ratelimit:${type}`,
    analytics: true,
  });

  rateLimiters.set(type, limiter);
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for an identifier (user ID, IP, etc.)
 */
export async function rateLimit(
  identifier: string,
  type: RateLimitType = "api"
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(type);

  // If Redis not configured, allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: RATE_LIMITS[type].requests,
      remaining: RATE_LIMITS[type].requests,
      reset: Date.now() + 60000,
    };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Helper to get rate limit headers for HTTP responses
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

/**
 * Server action wrapper with rate limiting
 * Returns error object if rate limited
 */
export async function withRateLimit<T>(
  identifier: string,
  type: RateLimitType,
  action: () => Promise<T>
): Promise<T | { success: false; error: string; retryAfter: number }> {
  const result = await rateLimit(identifier, type);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    };
  }

  return action();
}
