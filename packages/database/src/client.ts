import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enable query logging with DEBUG_QUERIES=true for N+1 detection
const enableQueryLogging = process.env.DEBUG_QUERIES === "true";

type LogLevel = "query" | "info" | "warn" | "error";

function createPrismaClient() {
  const logConfig: LogLevel[] = enableQueryLogging
    ? ["query", "info", "warn", "error"]
    : process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"];

  // For development with Prisma's built-in Postgres
  if (process.env.DATABASE_URL?.startsWith("prisma+postgres")) {
    // Use Prisma Accelerate for local development
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({
      log: logConfig,
      accelerateUrl: process.env.DATABASE_URL,
    } as any);
  }

  // For production with a standard PostgreSQL URL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool settings for high concurrency
    max: 20, // Maximum connections in pool
    min: 5, // Minimum idle connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: logConfig,
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
