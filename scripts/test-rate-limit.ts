/**
 * Rate Limiting Test Script
 *
 * Tests the Upstash Redis rate limiting functionality directly.
 * Verifies that limits are enforced correctly.
 *
 * Run with: npx tsx scripts/test-rate-limit.ts
 */

import { config } from "dotenv";
config();

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Test configuration
const TESTS = [
  { type: "message", limit: 30, window: "1 m", testRequests: 35 },
  { type: "thread", limit: 10, window: "1 m", testRequests: 15 },
  { type: "auth", limit: 5, window: "1 m", testRequests: 8 },
];

interface TestResult {
  type: string;
  limit: number;
  attempted: number;
  allowed: number;
  blocked: number;
  rateLimitWorking: boolean;
}

async function testRateLimit(
  redis: Redis,
  type: string,
  limit: number,
  window: string,
  testRequests: number
): Promise<TestResult> {
  const testUserId = `test-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window as `${number} m`),
    prefix: `ratelimit-test:${type}`,
  });

  let allowed = 0;
  let blocked = 0;

  console.log(`\n🧪 Testing "${type}" rate limit: ${limit} requests per ${window}`);
  console.log(`   Sending ${testRequests} requests...`);

  const startTime = Date.now();

  for (let i = 0; i < testRequests; i++) {
    const result = await limiter.limit(testUserId);
    if (result.success) {
      allowed++;
    } else {
      blocked++;
    }
  }

  const duration = Date.now() - startTime;

  // Rate limiting is working if we blocked requests after the limit
  const rateLimitWorking = blocked > 0 && allowed <= limit;

  console.log(`   ✅ Allowed: ${allowed}`);
  console.log(`   ⛔ Blocked: ${blocked}`);
  console.log(`   ⏱️  Duration: ${duration}ms`);
  console.log(`   ${rateLimitWorking ? "✅ Rate limiting WORKING" : "❌ Rate limiting NOT working"}`);

  // Cleanup test keys
  await redis.del(`ratelimit-test:${type}:${testUserId}`);

  return {
    type,
    limit,
    attempted: testRequests,
    allowed,
    blocked,
    rateLimitWorking,
  };
}

async function testBurstProtection(redis: Redis): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("⚡ BURST PROTECTION TEST");
  console.log("=".repeat(50));

  const testUserId = `burst-test-${Date.now()}`;
  const BURST_SIZE = 50;
  const LIMIT = 30;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(LIMIT, "1 m"),
    prefix: "ratelimit-test:burst",
  });

  console.log(`\nSimulating burst of ${BURST_SIZE} simultaneous requests (limit: ${LIMIT})...`);

  const startTime = Date.now();

  // Send all requests in parallel (simulating burst)
  const results = await Promise.all(
    Array(BURST_SIZE)
      .fill(null)
      .map(() => limiter.limit(testUserId))
  );

  const duration = Date.now() - startTime;
  const allowed = results.filter((r) => r.success).length;
  const blocked = results.filter((r) => !r.success).length;

  console.log(`\nResults:`);
  console.log(`  ✅ Allowed: ${allowed}`);
  console.log(`  ⛔ Blocked: ${blocked}`);
  console.log(`  ⏱️  Duration: ${duration}ms`);

  if (allowed <= LIMIT && blocked >= BURST_SIZE - LIMIT) {
    console.log(`\n✅ Burst protection WORKING - blocked ${blocked} excess requests`);
  } else {
    console.log(`\n⚠️ Burst protection may not be working correctly`);
  }

  // Cleanup
  await redis.del(`ratelimit-test:burst:${testUserId}`);
}

async function testRateLimitRecovery(redis: Redis): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("🔄 RATE LIMIT RECOVERY TEST");
  console.log("=".repeat(50));

  const testUserId = `recovery-test-${Date.now()}`;
  const LIMIT = 5;
  const WINDOW_SECONDS = 10;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(LIMIT, `${WINDOW_SECONDS} s`),
    prefix: "ratelimit-test:recovery",
  });

  console.log(`\nTest: ${LIMIT} requests per ${WINDOW_SECONDS} seconds`);
  console.log("Phase 1: Exhaust the limit...");

  // Exhaust the limit
  for (let i = 0; i < LIMIT + 2; i++) {
    const result = await limiter.limit(testUserId);
    if (i < LIMIT) {
      console.log(`  Request ${i + 1}: ${result.success ? "✅ allowed" : "⛔ blocked"}`);
    } else {
      console.log(`  Request ${i + 1}: ${result.success ? "✅ allowed" : "⛔ blocked"} (should be blocked)`);
    }
  }

  console.log(`\nPhase 2: Waiting ${WINDOW_SECONDS + 1} seconds for window to reset...`);
  await new Promise((resolve) => setTimeout(resolve, (WINDOW_SECONDS + 1) * 1000));

  console.log("Phase 3: Testing recovery...");
  const recoveryResult = await limiter.limit(testUserId);

  if (recoveryResult.success) {
    console.log("  ✅ Request allowed after window reset - Recovery WORKING");
  } else {
    console.log("  ❌ Request still blocked - Recovery NOT working");
  }

  // Cleanup
  await redis.del(`ratelimit-test:recovery:${testUserId}`);
}

async function main(): Promise<void> {
  console.log("=".repeat(50));
  console.log("🔒 RATE LIMITING TEST SUITE");
  console.log("=".repeat(50));

  // Check Redis configuration
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("❌ Upstash Redis not configured!");
    console.error("   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env");
    process.exit(1);
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  console.log("✅ Connected to Upstash Redis");

  // Test each rate limit type
  const results: TestResult[] = [];

  for (const test of TESTS) {
    const result = await testRateLimit(
      redis,
      test.type,
      test.limit,
      test.window,
      test.testRequests
    );
    results.push(result);
  }

  // Burst protection test
  await testBurstProtection(redis);

  // Recovery test (takes ~11 seconds)
  console.log("\n⏳ Running recovery test (takes ~11 seconds)...");
  await testRateLimitRecovery(redis);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));

  console.log("\n| Type    | Limit | Attempted | Allowed | Blocked | Status |");
  console.log("|---------|-------|-----------|---------|---------|--------|");

  let allPassing = true;
  for (const result of results) {
    const status = result.rateLimitWorking ? "✅ PASS" : "❌ FAIL";
    if (!result.rateLimitWorking) allPassing = false;
    console.log(
      `| ${result.type.padEnd(7)} | ${result.limit.toString().padStart(5)} | ${result.attempted.toString().padStart(9)} | ${result.allowed.toString().padStart(7)} | ${result.blocked.toString().padStart(7)} | ${status} |`
    );
  }

  console.log("\n" + "=".repeat(50));
  if (allPassing) {
    console.log("✅ ALL RATE LIMIT TESTS PASSED");
  } else {
    console.log("❌ SOME TESTS FAILED - Check configuration");
  }
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
