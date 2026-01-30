"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseUserAgent } from "@/lib/user-agent";

export interface LoginAttemptData {
  email: string;
  success: boolean;
  reason?: string;
  ipAddress: string;
  userAgent?: string;
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(data: LoginAttemptData) {
  try {
    // Find user by email (may not exist for failed attempts)
    const user = await db.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      select: { id: true },
    });

    await db.loginAttempt.create({
      data: {
        userId: user?.id || null,
        email: data.email.toLowerCase().trim(),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        success: data.success,
        reason: data.reason || null,
      },
    });
  } catch (error) {
    // Don't fail the login if tracking fails
    console.error("[LoginTracking] Failed to record attempt:", error);
  }
}

/**
 * Get login history for the current user
 */
export async function getLoginHistory(limit: number = 20) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const attempts = await db.loginAttempt.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { email: session.user.email },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        ipAddress: true,
        userAgent: true,
        success: true,
        reason: true,
        createdAt: true,
      },
    });

    // Parse user agents for display
    const attemptsWithDevice = attempts.map((attempt) => {
      const parsed = parseUserAgent(attempt.userAgent);
      return {
        ...attempt,
        device: parsed.deviceName,
        browser: parsed.browser,
        os: parsed.os,
        deviceType: parsed.deviceType,
      };
    });

    return { success: true, data: attemptsWithDevice };
  } catch (error) {
    console.error("[LoginTracking] Failed to get history:", error);
    return { success: false, error: "Failed to fetch login history" };
  }
}

/**
 * Check for suspicious login activity
 */
export async function checkSuspiciousActivity(
  email: string,
  ipAddress: string
): Promise<{
  suspicious: boolean;
  reason?: string;
}> {
  try {
    // Check for too many failed attempts from this IP in the last hour
    const recentFailedAttempts = await db.loginAttempt.count({
      where: {
        ipAddress,
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentFailedAttempts >= 10) {
      return {
        suspicious: true,
        reason: "Too many failed login attempts from this IP",
      };
    }

    // Check for too many failed attempts for this email in the last hour
    const emailFailedAttempts = await db.loginAttempt.count({
      where: {
        email: email.toLowerCase().trim(),
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    if (emailFailedAttempts >= 5) {
      return {
        suspicious: true,
        reason: "Too many failed login attempts for this account",
      };
    }

    return { suspicious: false };
  } catch (error) {
    console.error("[LoginTracking] Failed to check suspicious activity:", error);
    // Don't block login if check fails
    return { suspicious: false };
  }
}

/**
 * Clean up old login attempts (for cron job)
 */
export async function cleanupOldLoginAttempts(daysToKeep: number = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { count } = await db.loginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return { success: true, deletedCount: count };
  } catch (error) {
    console.error("[LoginTracking] Failed to cleanup:", error);
    return { success: false, error: "Failed to cleanup old records" };
  }
}
