import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // For development with Prisma's built-in Postgres
  if (process.env.DATABASE_URL?.startsWith("prisma+postgres")) {
    // Use Prisma Accelerate for local development
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      accelerateUrl: process.env.DATABASE_URL,
    });
  }

  // For production with a standard PostgreSQL URL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool settings for high concurrency
    max: 20,                      // Maximum connections in pool
    min: 5,                       // Minimum idle connections
    idleTimeoutMillis: 30000,     // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
