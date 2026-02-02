"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import type { ActionResult } from "@/types/action-result";

export interface DataExportStatus {
  id: string;
  status: string;
  requestedAt: Date;
  completedAt: Date | null;
  fileUrl: string | null;
  expiresAt: Date | null;
}

/**
 * Request a data export
 */
export async function requestDataExport(): Promise<ActionResult<{ requestId: string }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Rate limit - 1 export per day
  const rateLimitResult = await rateLimit(session.user.id, "data-export");
  if (!rateLimitResult.success) {
    return {
      success: false,
      error: "You can only request one data export per day. Please try again tomorrow.",
    };
  }

  try {
    // Check for pending export
    const pendingExport = await db.dataExportRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (pendingExport) {
      return {
        success: false,
        error: "You already have a pending data export request",
      };
    }

    // Create new export request
    const exportRequest = await db.dataExportRequest.create({
      data: {
        userId: session.user.id,
        status: "PENDING",
      },
    });

    // Trigger async processing (in production, use a queue)
    // For now, we'll process it directly
    processDataExport(exportRequest.id).catch(console.error);

    return {
      success: true,
      data: { requestId: exportRequest.id },
    };
  } catch (error) {
    console.error("[DataExport] Request failed:", error);
    return { success: false, error: "Failed to request data export" };
  }
}

/**
 * Get data export status
 */
export async function getDataExportStatus(): Promise<ActionResult<DataExportStatus | null>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const latestExport = await db.dataExportRequest.findFirst({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        completedAt: true,
        fileUrl: true,
        expiresAt: true,
      },
    });

    return { success: true, data: latestExport };
  } catch (error) {
    console.error("[DataExport] Status check failed:", error);
    return { success: false, error: "Failed to get export status" };
  }
}

/**
 * Get all export requests for current user
 */
export async function getExportHistory(): Promise<ActionResult<DataExportStatus[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const exports = await db.dataExportRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        requestedAt: true,
        completedAt: true,
        fileUrl: true,
        expiresAt: true,
      },
    });

    return { success: true, data: exports };
  } catch (error) {
    console.error("[DataExport] History fetch failed:", error);
    return { success: false, error: "Failed to get export history" };
  }
}

/**
 * Process a data export request
 */
async function processDataExport(requestId: string) {
  try {
    // Update status to processing
    await db.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "PROCESSING" },
    });

    const exportRequest = await db.dataExportRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!exportRequest) {
      throw new Error("Export request not found");
    }

    // Gather all user data
    const userData = await gatherUserData(exportRequest.userId);

    // In production, upload to cloud storage (S3, etc.)
    // For now, we'll create a data URL or store in database
    const jsonData = JSON.stringify(userData, null, 2);

    // Create a base64 data URL (for small exports)
    // In production, use cloud storage
    const base64Data = Buffer.from(jsonData).toString("base64");
    const fileUrl = `data:application/json;base64,${base64Data}`;

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update export request
    await db.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        fileUrl,
        expiresAt,
      },
    });

    // Send notification email
    await sendEmail({
      to: exportRequest.user.email,
      subject: "Your KinderCare Data Export is Ready",
      html: dataExportReadyEmail({
        userName: exportRequest.user.firstName,
        downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/security`,
        expiresIn: "7 days",
      }),
    });
  } catch (error) {
    console.error("[DataExport] Processing failed:", error);

    await db.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "FAILED" },
    });
  }
}

/**
 * Gather all user data for export
 */
async function gatherUserData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const children = await db.familyMember.findMany({
    where: { patientId: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      allergies: true,
      specialNeeds: true,
      notes: true,
      createdAt: true,
    },
  });

  const bookings = await db.appointment.findMany({
    where: { patientId: userId },
    include: {
      daycare: {
        select: { name: true, address: true },
      },
      child: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  const reviews = await db.review.findMany({
    where: { userId },
    include: {
      daycare: {
        select: { name: true },
      },
    },
  });

  const messages = await db.message.findMany({
    where: { senderId: userId },
    include: {
      thread: {
        select: {
          daycare: { select: { name: true } },
        },
      },
    },
  });

  const favorites = await db.favorite.findMany({
    where: { userId },
    include: {
      daycare: {
        select: { name: true, address: true },
      },
    },
  });

  const savedSearches = await db.savedSearch.findMany({
    where: { userId },
  });

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const loginHistory = await db.loginAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      email: true,
      ipAddress: true,
      success: true,
      createdAt: true,
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    user,
    children,
    bookings,
    reviews,
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      daycareName: m.thread?.daycare?.name,
    })),
    favorites: favorites.map((f) => ({
      daycareName: f.daycare.name,
      daycareAddress: f.daycare.address,
      addedAt: f.createdAt,
    })),
    savedSearches,
    notifications: notifications.map((n) => ({
      type: n.type,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
    })),
    loginHistory,
  };
}

/**
 * Email template for data export ready notification
 */
function dataExportReadyEmail({
  userName,
  downloadUrl,
  expiresIn,
}: {
  userName: string;
  downloadUrl: string;
  expiresIn: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Data Export is Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Data Export is Ready</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${userName},</p>

    <p>Your data export has been completed and is ready for download.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <p style="margin: 5px 0;"><strong>Important:</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>This download link expires in <strong>${expiresIn}</strong></li>
        <li>The file contains all your personal data in JSON format</li>
        <li>Please store this file securely</li>
      </ul>
    </div>

    <a href="${downloadUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Download Your Data</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you didn't request this export, please contact our support team immediately.
      <br><br>
      Best regards,<br>The KinderCare Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Clean up expired exports (for cron job)
 */
export async function cleanupExpiredExports() {
  try {
    const { count } = await db.dataExportRequest.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: "COMPLETED",
        fileUrl: { not: null },
      },
      data: {
        fileUrl: null,
      },
    });

    return { success: true, cleanedCount: count };
  } catch (error) {
    console.error("[DataExport] Cleanup failed:", error);
    return { success: false, error: "Failed to cleanup exports" };
  }
}
