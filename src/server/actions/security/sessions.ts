"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseUserAgent } from "@/lib/user-agent";
import crypto from "crypto";
import type { ActionResult } from "@/types/action-result";

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

/**
 * Hash a JWT ID for storage (internal helper)
 */
function hashTokenId(jti: string): string {
  return crypto.createHash("sha256").update(jti).digest("hex");
}

/**
 * Create a new session record
 */
export async function createSession(data: {
  userId: string;
  jti: string;
  ipAddress: string;
  userAgent?: string;
}) {
  try {
    const parsed = parseUserAgent(data.userAgent || null);
    const tokenHash = hashTokenId(data.jti);

    await db.userSession.create({
      data: {
        userId: data.userId,
        tokenHash,
        deviceName: parsed.deviceName,
        browser: parsed.browser,
        os: parsed.os,
        ipAddress: data.ipAddress,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[Sessions] Failed to create session:", error);
    return { success: false, error: "Failed to create session" };
  }
}

/**
 * Update session last active time
 */
export async function updateSessionActivity(jti: string) {
  try {
    const tokenHash = hashTokenId(jti);

    await db.userSession.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { lastActiveAt: new Date() },
    });
  } catch (error) {
    // Don't fail requests if activity update fails
    console.error("[Sessions] Failed to update activity:", error);
  }
}

/**
 * Check if a session is revoked
 */
export async function isSessionRevoked(jti: string): Promise<boolean> {
  try {
    const tokenHash = hashTokenId(jti);

    const session = await db.userSession.findUnique({
      where: { tokenHash },
      select: { isRevoked: true },
    });

    // If session not found, consider it valid (first-time session)
    if (!session) {
      return false;
    }

    return session.isRevoked;
  } catch (error) {
    console.error("[Sessions] Failed to check revocation:", error);
    // Default to not revoked to avoid blocking users
    return false;
  }
}

/**
 * Get all active sessions for current user
 */
export async function getActiveSessions(
  currentJti?: string
): Promise<ActionResult<SessionInfo[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const sessions = await db.userSession.findMany({
      where: {
        userId: session.user.id,
        isRevoked: false,
      },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        tokenHash: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    const currentTokenHash = currentJti ? hashTokenId(currentJti) : null;

    const sessionInfos: SessionInfo[] = sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: s.tokenHash === currentTokenHash,
    }));

    return { success: true, data: sessionInfos };
  } catch (error) {
    console.error("[Sessions] Failed to get sessions:", error);
    return { success: false, error: "Failed to fetch sessions" };
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Verify the session belongs to the current user
    const targetSession = await db.userSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        isRevoked: false,
      },
    });

    if (!targetSession) {
      return { success: false, error: "Session not found" };
    }

    await db.userSession.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[Sessions] Failed to revoke session:", error);
    return { success: false, error: "Failed to revoke session" };
  }
}

/**
 * Revoke all sessions except the current one
 */
export async function revokeAllOtherSessions(
  currentJti: string
): Promise<ActionResult<{ revokedCount: number }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const currentTokenHash = hashTokenId(currentJti);

    const result = await db.userSession.updateMany({
      where: {
        userId: session.user.id,
        isRevoked: false,
        tokenHash: { not: currentTokenHash },
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return { success: true, data: { revokedCount: result.count } };
  } catch (error) {
    console.error("[Sessions] Failed to revoke all sessions:", error);
    return { success: false, error: "Failed to revoke sessions" };
  }
}

/**
 * Revoke all sessions for a user (for password change, account compromise, etc.)
 */
export async function revokeAllUserSessions(
  userId: string
): Promise<ActionResult<{ revokedCount: number }>> {
  try {
    const result = await db.userSession.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return { success: true, data: { revokedCount: result.count } };
  } catch (error) {
    console.error("[Sessions] Failed to revoke all user sessions:", error);
    return { success: false, error: "Failed to revoke sessions" };
  }
}

/**
 * Clean up old revoked sessions (for cron job)
 */
export async function cleanupOldSessions(daysToKeep: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { count } = await db.userSession.deleteMany({
      where: {
        OR: [
          // Delete revoked sessions older than cutoff
          {
            isRevoked: true,
            revokedAt: { lt: cutoffDate },
          },
          // Delete inactive sessions older than cutoff
          {
            lastActiveAt: { lt: cutoffDate },
          },
        ],
      },
    });

    return { success: true, deletedCount: count };
  } catch (error) {
    console.error("[Sessions] Failed to cleanup:", error);
    return { success: false, error: "Failed to cleanup old sessions" };
  }
}
