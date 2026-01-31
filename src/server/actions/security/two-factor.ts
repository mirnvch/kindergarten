"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  generateSecret,
  generateTotpUri,
  generateQRCode,
  verifyToken,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Start 2FA setup - generates secret and QR code
 */
export async function initiate2FASetup(): Promise<
  ActionResult<{ qrCode: string; secret: string }>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!session.user.email) {
    return { success: false, error: "Email is required for 2FA setup" };
  }

  // Rate limit
  const rateLimitResult = await rateLimit(session.user.id, "2fa-setup");
  if (!rateLimitResult.success) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  try {
    // Check if 2FA is already enabled
    const existing = await db.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (existing?.isEnabled) {
      return { success: false, error: "2FA is already enabled" };
    }

    // Generate new secret
    const secret = generateSecret();
    const otpUri = generateTotpUri(secret, session.user.email!);
    const qrCode = await generateQRCode(otpUri);

    // Store encrypted secret (not enabled yet)
    const encryptedSecret = encryptSecret(secret);

    await db.twoFactorAuth.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        secret: encryptedSecret,
        isEnabled: false,
      },
      update: {
        secret: encryptedSecret,
        isEnabled: false,
        verifiedAt: null,
      },
    });

    return {
      success: true,
      data: { qrCode, secret },
    };
  } catch (error) {
    console.error("[2FA] Setup initiation failed:", error);
    return { success: false, error: "Failed to initiate 2FA setup" };
  }
}

/**
 * Verify and enable 2FA
 */
export async function verify2FASetup(
  token: string
): Promise<ActionResult<{ backupCodes: string[] }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Rate limit
  const rateLimitResult = await rateLimit(session.user.id, "2fa-verify");
  if (!rateLimitResult.success) {
    return { success: false, error: "Too many attempts. Please wait and try again." };
  }

  try {
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (!twoFactorAuth) {
      return { success: false, error: "2FA setup not initiated" };
    }

    if (twoFactorAuth.isEnabled) {
      return { success: false, error: "2FA is already enabled" };
    }

    // Decrypt and verify the token
    const secret = decryptSecret(twoFactorAuth.secret);
    const isValid = await verifyToken(secret, token);

    if (!isValid) {
      return { success: false, error: "Invalid verification code" };
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Hash backup codes for storage
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => ({
        twoFactorAuthId: twoFactorAuth.id,
        code: await hashBackupCode(code),
      }))
    );

    // Enable 2FA and store backup codes in a transaction
    await db.$transaction([
      db.twoFactorAuth.update({
        where: { id: twoFactorAuth.id },
        data: {
          isEnabled: true,
          verifiedAt: new Date(),
        },
      }),
      // Delete any existing backup codes
      db.twoFactorBackupCode.deleteMany({
        where: { twoFactorAuthId: twoFactorAuth.id },
      }),
      // Create new backup codes
      db.twoFactorBackupCode.createMany({
        data: hashedCodes,
      }),
    ]);

    // Set 2FA session as verified (user just proved they have the authenticator)
    await set2FASessionVerified(session.user.id);

    return {
      success: true,
      data: { backupCodes },
    };
  } catch (error) {
    console.error("[2FA] Verification failed:", error);
    return { success: false, error: "Failed to verify 2FA" };
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(
  token: string
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Rate limit
  const rateLimitResult = await rateLimit(session.user.id, "2fa-verify");
  if (!rateLimitResult.success) {
    return { success: false, error: "Too many attempts. Please wait and try again." };
  }

  try {
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return { success: false, error: "2FA is not enabled" };
    }

    // Verify the token
    const secret = decryptSecret(twoFactorAuth.secret);
    const isValid = await verifyToken(secret, token);

    if (!isValid) {
      return { success: false, error: "Invalid verification code" };
    }

    // Delete 2FA (cascade will delete backup codes)
    await db.twoFactorAuth.delete({
      where: { id: twoFactorAuth.id },
    });

    return { success: true };
  } catch (error) {
    console.error("[2FA] Disable failed:", error);
    return { success: false, error: "Failed to disable 2FA" };
  }
}

/**
 * Get 2FA status for current user
 */
export async function get2FAStatus(): Promise<
  ActionResult<{
    enabled: boolean;
    verifiedAt: Date | null;
    backupCodesRemaining: number;
  }>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
      include: {
        backupCodes: {
          where: { usedAt: null },
          select: { id: true },
        },
      },
    });

    return {
      success: true,
      data: {
        enabled: twoFactorAuth?.isEnabled ?? false,
        verifiedAt: twoFactorAuth?.verifiedAt ?? null,
        backupCodesRemaining: twoFactorAuth?.backupCodes.length ?? 0,
      },
    };
  } catch (error) {
    console.error("[2FA] Status check failed:", error);
    return { success: false, error: "Failed to get 2FA status" };
  }
}

/**
 * Verify 2FA token during login
 */
export async function verify2FAToken(
  userId: string,
  token: string
): Promise<ActionResult> {
  // Rate limit
  const rateLimitResult = await rateLimit(userId, "2fa-verify");
  if (!rateLimitResult.success) {
    return { success: false, error: "Too many attempts. Please wait and try again." };
  }

  try {
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return { success: false, error: "2FA is not enabled for this account" };
    }

    const secret = decryptSecret(twoFactorAuth.secret);
    const isValid = await verifyToken(secret, token);

    if (!isValid) {
      return { success: false, error: "Invalid verification code" };
    }

    return { success: true };
  } catch (error) {
    console.error("[2FA] Token verification failed:", error);
    return { success: false, error: "Verification failed" };
  }
}

/**
 * Use a backup code during login
 */
export async function useBackupCode(
  userId: string,
  code: string
): Promise<ActionResult> {
  // Rate limit
  const rateLimitResult = await rateLimit(userId, "2fa-verify");
  if (!rateLimitResult.success) {
    return { success: false, error: "Too many attempts. Please wait and try again." };
  }

  try {
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId },
      include: {
        backupCodes: {
          where: { usedAt: null },
        },
      },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return { success: false, error: "2FA is not enabled for this account" };
    }

    // Find matching unused backup code
    for (const backupCode of twoFactorAuth.backupCodes) {
      const isMatch = await verifyBackupCode(code, backupCode.code);

      if (isMatch) {
        // Mark code as used
        await db.twoFactorBackupCode.update({
          where: { id: backupCode.id },
          data: { usedAt: new Date() },
        });

        return { success: true };
      }
    }

    return { success: false, error: "Invalid backup code" };
  } catch (error) {
    console.error("[2FA] Backup code verification failed:", error);
    return { success: false, error: "Verification failed" };
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(
  token: string
): Promise<ActionResult<{ backupCodes: string[] }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Rate limit
  const rateLimitResult = await rateLimit(session.user.id, "2fa-setup");
  if (!rateLimitResult.success) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  try {
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return { success: false, error: "2FA is not enabled" };
    }

    // Verify the token
    const secret = decryptSecret(twoFactorAuth.secret);
    const isValid = await verifyToken(secret, token);

    if (!isValid) {
      return { success: false, error: "Invalid verification code" };
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => ({
        twoFactorAuthId: twoFactorAuth.id,
        code: await hashBackupCode(code),
      }))
    );

    // Replace old codes
    await db.$transaction([
      db.twoFactorBackupCode.deleteMany({
        where: { twoFactorAuthId: twoFactorAuth.id },
      }),
      db.twoFactorBackupCode.createMany({
        data: hashedCodes,
      }),
    ]);

    return {
      success: true,
      data: { backupCodes },
    };
  } catch (error) {
    console.error("[2FA] Backup code regeneration failed:", error);
    return { success: false, error: "Failed to regenerate backup codes" };
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function check2FAEnabled(userId: string): Promise<boolean> {
  try {
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });

    return twoFactorAuth?.isEnabled ?? false;
  } catch {
    return false;
  }
}

// ==================== 2FA SESSION VERIFICATION ====================

const TWO_FA_SESSION_COOKIE = "2fa_session_verified";
const TWO_FA_SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours

/**
 * Set 2FA session as verified (call after successful 2FA verification)
 */
export async function set2FASessionVerified(userId: string): Promise<void> {
  const cookieStore = await cookies();

  // Cookie value includes userId and timestamp for validation
  const value = `${userId}:${Date.now()}`;

  cookieStore.set(TWO_FA_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TWO_FA_SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Check if current session has verified 2FA
 */
export async function is2FASessionVerified(userId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(TWO_FA_SESSION_COOKIE);

    if (!cookie?.value) {
      return false;
    }

    const [cookieUserId, timestamp] = cookie.value.split(":");

    // Verify the cookie is for the current user
    if (cookieUserId !== userId) {
      return false;
    }

    // Verify the cookie hasn't expired (extra safety check)
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > TWO_FA_SESSION_MAX_AGE * 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Clear 2FA session verification (call on logout)
 */
export async function clear2FASession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TWO_FA_SESSION_COOKIE);
}

/**
 * Check if user needs 2FA verification
 * Returns true if 2FA is enabled but session is not verified
 * Also checks for trusted devices - if device is trusted, skip 2FA
 */
export async function needs2FAVerification(userId: string): Promise<boolean> {
  const has2FA = await check2FAEnabled(userId);

  if (!has2FA) {
    return false;
  }

  // Check if already verified this session
  const isVerified = await is2FASessionVerified(userId);
  if (isVerified) {
    return false;
  }

  // Check if this is a trusted device
  const { isTrustedDevice } = await import("./trusted-devices");
  const isTrusted = await isTrustedDevice(userId);
  if (isTrusted) {
    // Device is trusted, set session as verified
    await set2FASessionVerified(userId);
    return false;
  }

  return true;
}
