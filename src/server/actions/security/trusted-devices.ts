"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";
import { parseUserAgent } from "@/lib/user-agent";
import { sendEmailAsync, newTrustedDeviceEmail } from "@/lib/email";

const MAX_TRUSTED_DEVICES = 5;
const TRUSTED_DEVICE_TTL_DAYS = 30;

type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Generate a device hash from request headers
 */
export async function generateDeviceHash(): Promise<string> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const acceptLanguage = headersList.get("accept-language") || "";

  // We don't include IP in the hash - we check it separately
  // This allows the same device to work across different networks
  // but we still verify IP hasn't changed drastically
  const data = `${userAgent}:${acceptLanguage}`;

  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Get client IP from headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Get user agent from headers
 */
async function getUserAgent(): Promise<string> {
  const headersList = await headers();
  return headersList.get("user-agent") || "Unknown";
}

/**
 * Generate a friendly device name from user agent
 */
function getDeviceName(userAgent: string): string {
  const parsed = parseUserAgent(userAgent);
  if (parsed.browser && parsed.os) {
    return `${parsed.browser} on ${parsed.os}`;
  }
  return "Unknown Device";
}

/**
 * Add a trusted device for the current user
 */
export async function addTrustedDevice(): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const deviceHash = await generateDeviceHash();
    const ipAddress = await getClientIP();
    const userAgent = await getUserAgent();
    const deviceName = getDeviceName(userAgent);

    // Check device limit
    const existingCount = await db.trustedDevice.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= MAX_TRUSTED_DEVICES) {
      // Remove the oldest device
      const oldest = await db.trustedDevice.findFirst({
        where: { userId: session.user.id },
        orderBy: { lastUsedAt: "asc" },
      });

      if (oldest) {
        await db.trustedDevice.delete({ where: { id: oldest.id } });
      }
    }

    // Add or update trusted device
    const expiresAt = new Date(
      Date.now() + TRUSTED_DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    // Check if this is a new device (not just updating existing)
    const existingDevice = await db.trustedDevice.findUnique({
      where: {
        userId_deviceHash: {
          userId: session.user.id,
          deviceHash,
        },
      },
    });

    const isNewDevice = !existingDevice;

    await db.trustedDevice.upsert({
      where: {
        userId_deviceHash: {
          userId: session.user.id,
          deviceHash,
        },
      },
      create: {
        userId: session.user.id,
        deviceHash,
        name: deviceName,
        userAgent,
        ipAddress,
        expiresAt,
      },
      update: {
        name: deviceName,
        userAgent,
        ipAddress,
        lastUsedAt: new Date(),
        expiresAt,
      },
    });

    // Send email notification for new trusted device
    if (isNewDevice && session.user.email) {
      const emailHtml = newTrustedDeviceEmail({
        userName: session.user.firstName || "User",
        deviceName,
        ipAddress,
      });

      await sendEmailAsync({
        to: session.user.email,
        subject: "New Trusted Device Added to Your Account",
        html: emailHtml,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[TrustedDevice] Failed to add:", error);
    return { success: false, error: "Failed to add trusted device" };
  }
}

/**
 * Check if current device is trusted for a user
 */
export async function isTrustedDevice(userId: string): Promise<boolean> {
  try {
    const deviceHash = await generateDeviceHash();
    const currentIP = await getClientIP();

    const device = await db.trustedDevice.findUnique({
      where: {
        userId_deviceHash: {
          userId,
          deviceHash,
        },
      },
    });

    if (!device) {
      return false;
    }

    // Check if expired
    if (device.expiresAt < new Date()) {
      // Clean up expired device
      await db.trustedDevice.delete({ where: { id: device.id } });
      return false;
    }

    // Check IP - if changed, require re-verification
    // This prevents stolen cookies from working on different networks
    if (device.ipAddress !== currentIP) {
      return false;
    }

    // Update last used time
    await db.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  } catch (error) {
    console.error("[TrustedDevice] Check failed:", error);
    return false;
  }
}

/**
 * Get all trusted devices for current user
 */
export async function getTrustedDevices(): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string | null;
      ipAddress: string;
      lastUsedAt: Date;
      createdAt: Date;
      isCurrent: boolean;
    }>
  >
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const currentDeviceHash = await generateDeviceHash();

    const devices = await db.trustedDevice.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
      select: {
        id: true,
        deviceHash: true,
        name: true,
        ipAddress: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: devices.map((device) => ({
        id: device.id,
        name: device.name,
        ipAddress: device.ipAddress,
        lastUsedAt: device.lastUsedAt,
        createdAt: device.createdAt,
        isCurrent: device.deviceHash === currentDeviceHash,
      })),
    };
  } catch (error) {
    console.error("[TrustedDevice] Failed to get devices:", error);
    return { success: false, error: "Failed to get trusted devices" };
  }
}

/**
 * Remove a trusted device
 */
export async function removeTrustedDevice(
  deviceId: string
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Verify the device belongs to the user
    const device = await db.trustedDevice.findFirst({
      where: {
        id: deviceId,
        userId: session.user.id,
      },
    });

    if (!device) {
      return { success: false, error: "Device not found" };
    }

    await db.trustedDevice.delete({ where: { id: deviceId } });

    return { success: true };
  } catch (error) {
    console.error("[TrustedDevice] Failed to remove:", error);
    return { success: false, error: "Failed to remove device" };
  }
}

/**
 * Remove all trusted devices for current user
 */
export async function removeAllTrustedDevices(): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await db.trustedDevice.deleteMany({
      where: { userId: session.user.id },
    });

    return { success: true };
  } catch (error) {
    console.error("[TrustedDevice] Failed to remove all:", error);
    return { success: false, error: "Failed to remove devices" };
  }
}
