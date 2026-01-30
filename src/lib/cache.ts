import { Redis } from "@upstash/redis";

// Initialize Redis client (lazy)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return redis;
}

// Cache TTL in seconds
export const CACHE_TTL = {
  SHORT: 30,           // 30 seconds - notifications count
  MEDIUM: 300,         // 5 minutes - search results, daycare details
  LONG: 3600,          // 1 hour - static data
  DAY: 86400,          // 24 hours - amenities, locations
} as const;

type CacheKey =
  | `search:${string}`
  | `daycare:${string}`
  | `amenities:all`
  | `locations:all`
  | `notifications:${string}:count`
  | `user:${string}`;

/**
 * Get cached value
 */
export async function cacheGet<T>(key: CacheKey): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (error) {
    console.error("[Cache] Get error:", error);
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function cacheSet<T>(
  key: CacheKey,
  value: T,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.error("[Cache] Set error:", error);
    return false;
  }
}

/**
 * Delete cached value
 */
export async function cacheDel(key: CacheKey): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error("[Cache] Del error:", error);
    return false;
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    await client.del(...keys);
    return keys.length;
  } catch (error) {
    console.error("[Cache] DelPattern error:", error);
    return 0;
  }
}

/**
 * Get or set pattern - fetch from cache or compute and cache
 */
export async function cacheGetOrSet<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Compute value
  const value = await fetcher();

  // Cache it (fire and forget)
  cacheSet(key, value, ttlSeconds);

  return value;
}

/**
 * Invalidate caches when data changes
 */
export const invalidateCache = {
  daycare: async (slug: string) => {
    await cacheDel(`daycare:${slug}`);
    await cacheDelPattern("search:*");
  },

  search: async () => {
    await cacheDelPattern("search:*");
  },

  amenities: async () => {
    await cacheDel("amenities:all");
  },

  locations: async () => {
    await cacheDel("locations:all");
  },

  notifications: async (userId: string) => {
    await cacheDel(`notifications:${userId}:count`);
  },
};

/**
 * Generate cache key for search queries
 */
export function searchCacheKey(filters: Record<string, unknown>): `search:${string}` {
  const sorted = Object.keys(filters)
    .sort()
    .filter((k) => filters[k] !== undefined && filters[k] !== "")
    .map((k) => `${k}=${JSON.stringify(filters[k])}`)
    .join("&");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `search:${hash.toString(36)}`;
}
