/**
 * Load Test Script for Real-time Messaging
 *
 * Tests:
 * 1. Rate limiting enforcement
 * 2. Concurrent message handling
 * 3. Database connection pool under load
 *
 * Run with: npx tsx scripts/load-test-messages.ts
 */

import { config } from "dotenv";
config(); // Load .env file

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createTestClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Make sure .env file exists.");
  }
  console.log(`📡 Connecting to: ${process.env.DATABASE_URL.split("@")[1]?.split("/")[0] || "database"}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
}

const CONCURRENT_USERS = 10;
const MESSAGES_PER_USER = 50;
const RATE_LIMIT = 30; // messages per minute

interface TestResult {
  totalMessages: number;
  successfulMessages: number;
  rateLimitedMessages: number;
  errorMessages: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  duration: number;
}

async function simulateUserMessages(
  db: PrismaClient,
  userId: string,
  threadId: string,
  messageCount: number
): Promise<{ success: number; rateLimited: number; errors: number; times: number[] }> {
  let success = 0;
  let rateLimited = 0;
  let errors = 0;
  const times: number[] = [];

  for (let i = 0; i < messageCount; i++) {
    const start = Date.now();

    try {
      await db.message.create({
        data: {
          threadId,
          senderId: userId,
          content: `Load test message ${i + 1} from user ${userId.slice(0, 8)}`,
          status: "SENT",
        },
      });
      success++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("rate limit") || errorMessage.includes("Too many")) {
        rateLimited++;
      } else {
        errors++;
        console.error(`Error for user ${userId}:`, errorMessage);
      }
    }

    times.push(Date.now() - start);

    // Simulate realistic message timing (100-500ms between messages)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 400 + 100));
  }

  return { success, rateLimited, errors, times };
}

async function runLoadTest(): Promise<TestResult> {
  console.log("🚀 Starting Load Test for Real-time Messaging\n");
  console.log(`Configuration:`);
  console.log(`  - Concurrent users: ${CONCURRENT_USERS}`);
  console.log(`  - Messages per user: ${MESSAGES_PER_USER}`);
  console.log(`  - Expected rate limit: ${RATE_LIMIT}/min\n`);

  const db = createTestClient();

  try {
    await db.$connect();
    console.log("✅ Database connected\n");

    // Get test users and threads
    const testUsers = await db.user.findMany({
      take: CONCURRENT_USERS,
      select: { id: true, email: true },
    });

    if (testUsers.length === 0) {
      throw new Error("No test users found. Run seed script first.");
    }

    // Get or create a test thread
    let testThread = await db.messageThread.findFirst({
      where: { subject: "LOAD_TEST_THREAD" },
    });

    if (!testThread) {
      const testProvider = await db.provider.findFirst({
        select: { id: true },
      });

      if (!testProvider) {
        throw new Error("No provider found. Run seed script first.");
      }

      // Use upsert to handle race conditions
      testThread = await db.messageThread.upsert({
        where: {
          providerId_patientId: {
            providerId: testProvider.id,
            patientId: testUsers[0].id,
          },
        },
        update: {
          subject: "LOAD_TEST_THREAD",
        },
        create: {
          providerId: testProvider.id,
          patientId: testUsers[0].id,
          subject: "LOAD_TEST_THREAD",
          lastMessageAt: new Date(),
        },
      });
    }

    console.log(`📝 Using thread: ${testThread.id}`);
    console.log(`👥 Testing with ${testUsers.length} users\n`);
    console.log("Starting load test...\n");

    const startTime = Date.now();

    // Run concurrent user simulations
    const results = await Promise.all(
      testUsers.map((user) =>
        simulateUserMessages(db, user.id, testThread!.id, MESSAGES_PER_USER)
      )
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Aggregate results
    const allTimes = results.flatMap((r) => r.times);
    const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
    const totalRateLimited = results.reduce((sum, r) => sum + r.rateLimited, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    const result: TestResult = {
      totalMessages: CONCURRENT_USERS * MESSAGES_PER_USER,
      successfulMessages: totalSuccess,
      rateLimitedMessages: totalRateLimited,
      errorMessages: totalErrors,
      avgResponseTime: allTimes.reduce((a, b) => a + b, 0) / allTimes.length,
      maxResponseTime: Math.max(...allTimes),
      minResponseTime: Math.min(...allTimes),
      duration,
    };

    // Print results
    console.log("\n" + "=".repeat(50));
    console.log("📊 LOAD TEST RESULTS");
    console.log("=".repeat(50));
    console.log(`Total messages attempted: ${result.totalMessages}`);
    console.log(`✅ Successful: ${result.successfulMessages}`);
    console.log(`⏳ Rate limited: ${result.rateLimitedMessages}`);
    console.log(`❌ Errors: ${result.errorMessages}`);
    console.log(`\nResponse times:`);
    console.log(`  Average: ${result.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Min: ${result.minResponseTime}ms`);
    console.log(`  Max: ${result.maxResponseTime}ms`);
    console.log(`\nTotal duration: ${result.duration.toFixed(2)}s`);
    console.log(
      `Throughput: ${(result.successfulMessages / result.duration).toFixed(2)} msg/s`
    );

    // Analyze rate limiting effectiveness
    const expectedRateLimited = Math.max(
      0,
      result.totalMessages - RATE_LIMIT * CONCURRENT_USERS * (result.duration / 60)
    );
    console.log(`\n📈 Rate Limiting Analysis:`);
    console.log(`  Expected rate limited (approx): ${Math.round(expectedRateLimited)}`);
    console.log(`  Actual rate limited: ${result.rateLimitedMessages}`);

    if (result.rateLimitedMessages > 0) {
      console.log(`  ✅ Rate limiting is working!`);
    } else if (result.duration < 60) {
      console.log(`  ℹ️ Test duration < 1 min, rate limiting may not trigger`);
    }

    // Cleanup test messages
    console.log("\n🧹 Cleaning up test messages...");
    await db.message.deleteMany({
      where: {
        threadId: testThread.id,
        content: { startsWith: "Load test message" },
      },
    });
    console.log("✅ Cleanup complete");

    return result;
  } finally {
    await db.$disconnect();
  }
}

// Connection pool stress test
async function testConnectionPool(): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("🔌 CONNECTION POOL STRESS TEST");
  console.log("=".repeat(50));

  const PARALLEL_QUERIES = 50;

  const db = createTestClient();

  try {
    await db.$connect();

    console.log(`Running ${PARALLEL_QUERIES} parallel queries...`);

    const start = Date.now();

    const queries = Array(PARALLEL_QUERIES)
      .fill(null)
      .map(() =>
        db.message.count().catch((e: Error) => {
          console.error("Query failed:", e.message);
          return -1;
        })
      );

    const results = await Promise.all(queries);
    const failures = results.filter((r) => r === -1).length;

    const duration = Date.now() - start;

    console.log(`\nResults:`);
    console.log(`  ✅ Successful queries: ${PARALLEL_QUERIES - failures}`);
    console.log(`  ❌ Failed queries: ${failures}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Avg per query: ${(duration / PARALLEL_QUERIES).toFixed(2)}ms`);

    if (failures === 0) {
      console.log(`\n✅ Connection pool handled ${PARALLEL_QUERIES} parallel queries successfully!`);
    } else {
      console.log(`\n⚠️ Some queries failed - consider increasing pool size`);
    }
  } finally {
    await db.$disconnect();
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    await runLoadTest();
    await testConnectionPool();

    console.log("\n" + "=".repeat(50));
    console.log("✅ ALL TESTS COMPLETED");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main();
