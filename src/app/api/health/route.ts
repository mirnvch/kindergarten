import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type HealthStatus = "healthy" | "degraded" | "unhealthy";

interface HealthCheck {
  status: HealthStatus;
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  checks: {
    database: HealthCheck;
    redis?: HealthCheck;
  };
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthResponse["checks"] = {
    database: { status: "unhealthy" },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = {
      status: "healthy",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check Redis (if configured)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
      });

      const redisStart = Date.now();
      await redis.ping();
      checks.redis = {
        status: "healthy",
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
  const anyUnhealthy = Object.values(checks).some((c) => c.status === "unhealthy");

  const overallStatus: HealthStatus = allHealthy
    ? "healthy"
    : anyUnhealthy
    ? "unhealthy"
    : "degraded";

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
    checks,
  };

  return NextResponse.json(response, {
    status: overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}
