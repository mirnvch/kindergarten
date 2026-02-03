"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { revokeAllUserSessions } from "./sessions";
import type { ActionResult } from "@/types/action-result";

// Grace period in days before account is permanently deleted
const DELETION_GRACE_PERIOD_DAYS = 14;

/**
 * Request account deletion
 */
export async function requestAccountDeletion(
  password: string
): Promise<ActionResult<{ scheduledAt: Date }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Rate limit
  const rateLimitResult = await rateLimit(session.user.id, "account-delete");
  if (!rateLimitResult.success) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        passwordHash: true,
        deletionRequestedAt: true,
        accounts: { select: { provider: true } },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check if already scheduled for deletion
    if (user.deletionRequestedAt) {
      return {
        success: false,
        error: "Account deletion is already scheduled",
      };
    }

    // For OAuth-only users, skip password check
    const hasPassword = !!user.passwordHash;
    const hasOAuth = user.accounts.length > 0;

    if (hasPassword) {
      // Verify password for users with password
      const isValid = await bcrypt.compare(password, user.passwordHash!);
      if (!isValid) {
        return { success: false, error: "Invalid password" };
      }
    } else if (!hasOAuth) {
      // User has neither password nor OAuth - shouldn't happen
      return { success: false, error: "Unable to verify identity" };
    }

    // Calculate scheduled deletion date
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + DELETION_GRACE_PERIOD_DAYS);

    // Update user record
    await db.user.update({
      where: { id: session.user.id },
      data: {
        deletionRequestedAt: new Date(),
        deletionScheduledAt: scheduledAt,
      },
    });

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: "Account Deletion Scheduled - KinderCare",
      html: accountDeletionScheduledEmail({
        userName: user.firstName,
        scheduledDate: scheduledAt.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/security`,
      }),
    });

    return {
      success: true,
      data: { scheduledAt },
    };
  } catch (error) {
    console.error("[AccountDeletion] Request failed:", error);
    return { success: false, error: "Failed to schedule account deletion" };
  }
}

/**
 * Cancel account deletion
 */
export async function cancelAccountDeletion(): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        deletionRequestedAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (!user.deletionRequestedAt) {
      return { success: false, error: "No deletion request found" };
    }

    // Cancel deletion
    await db.user.update({
      where: { id: session.user.id },
      data: {
        deletionRequestedAt: null,
        deletionScheduledAt: null,
      },
    });

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: "Account Deletion Cancelled - KinderCare",
      html: accountDeletionCancelledEmail({
        userName: user.firstName,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("[AccountDeletion] Cancel failed:", error);
    return { success: false, error: "Failed to cancel account deletion" };
  }
}

/**
 * Get account deletion status
 */
export async function getAccountDeletionStatus(): Promise<
  ActionResult<{
    isScheduled: boolean;
    requestedAt: Date | null;
    scheduledAt: Date | null;
    daysRemaining: number | null;
  }>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        deletionRequestedAt: true,
        deletionScheduledAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const isScheduled = !!user.deletionRequestedAt;
    let daysRemaining: number | null = null;

    if (user.deletionScheduledAt) {
      const now = new Date();
      const diff = user.deletionScheduledAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      data: {
        isScheduled,
        requestedAt: user.deletionRequestedAt,
        scheduledAt: user.deletionScheduledAt,
        daysRemaining,
      },
    };
  } catch (error) {
    console.error("[AccountDeletion] Status check failed:", error);
    return { success: false, error: "Failed to get deletion status" };
  }
}

/**
 * Process scheduled deletions (for cron job)
 * This should be called periodically to process accounts due for deletion
 */
export async function processScheduledDeletions(): Promise<
  ActionResult<{ processedCount: number }>
> {
  try {
    // Find accounts due for deletion
    const usersToDelete = await db.user.findMany({
      where: {
        deletionScheduledAt: { lte: new Date() },
        anonymizedAt: null,
      },
      take: 100, // Process in batches
    });

    let processedCount = 0;

    for (const user of usersToDelete) {
      try {
        await anonymizeUser(user.id);
        processedCount++;
      } catch (error) {
        console.error(`[AccountDeletion] Failed to process user ${user.id}:`, error);
      }
    }

    return { success: true, data: { processedCount } };
  } catch (error) {
    console.error("[AccountDeletion] Batch processing failed:", error);
    return { success: false, error: "Failed to process deletions" };
  }
}

/**
 * Anonymize a user account (GDPR-compliant deletion)
 */
async function anonymizeUser(userId: string) {
  // Use a transaction for data consistency
  await db.$transaction(async (tx) => {
    const anonymizedEmail = `deleted-${userId}@anonymized.kindercare.app`;

    // Revoke all sessions
    await revokeAllUserSessions(userId);

    // Delete related data that should be removed
    await tx.familyMember.deleteMany({ where: { patientId: userId } });
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.savedSearch.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.loginAttempt.deleteMany({ where: { userId } });
    await tx.userSession.deleteMany({ where: { userId } });
    await tx.dataExportRequest.deleteMany({ where: { userId } });
    await tx.twoFactorAuth.deleteMany({ where: { userId } });

    // Anonymize messages but keep for conversation history
    await tx.message.updateMany({
      where: { senderId: userId },
      data: { senderId: userId }, // Keep reference for display as "Deleted User"
    });

    // Anonymize reviews
    await tx.review.updateMany({
      where: { userId },
      data: {
        title: "[Deleted]",
        content: "[This review was removed when the user deleted their account]",
      },
    });

    // Anonymize the user record
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        firstName: "Deleted",
        lastName: "User",
        phone: null,
        avatarUrl: null,
        passwordHash: null,
        isActive: false,
        anonymizedAt: new Date(),
        deletionRequestedAt: null,
        deletionScheduledAt: null,
      },
    });

    // Delete OAuth accounts
    await tx.account.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
  });
}

/**
 * Immediately delete account (admin use or special cases)
 */
export async function immediateAccountDeletion(
  userId: string,
  adminId: string
): Promise<ActionResult> {
  try {
    // Verify admin permissions
    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (admin?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    await anonymizeUser(userId);

    return { success: true };
  } catch (error) {
    console.error("[AccountDeletion] Immediate deletion failed:", error);
    return { success: false, error: "Failed to delete account" };
  }
}

/**
 * Email template for scheduled deletion
 */
function accountDeletionScheduledEmail({
  userName,
  scheduledDate,
  cancelUrl,
}: {
  userName: string;
  scheduledDate: string;
  cancelUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deletion Scheduled</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Account Deletion Scheduled</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${userName},</p>

    <p>As requested, your KinderCare account has been scheduled for deletion.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 5px 0;"><strong>Scheduled Deletion Date:</strong></p>
      <p style="margin: 5px 0; font-size: 18px; color: #ef4444;">${scheduledDate}</p>
    </div>

    <p><strong>What happens next:</strong></p>
    <ul style="padding-left: 20px;">
      <li>Your account will remain active until the scheduled date</li>
      <li>You can cancel the deletion at any time before then</li>
      <li>After deletion, your personal data will be removed</li>
      <li>Some anonymized data may be retained for legal purposes</li>
    </ul>

    <p style="margin-top: 20px;">Changed your mind?</p>

    <a href="${cancelUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Cancel Deletion</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you didn't request this, please cancel the deletion immediately and change your password.
      <br><br>
      Best regards,<br>The KinderCare Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email template for cancelled deletion
 */
function accountDeletionCancelledEmail({ userName }: { userName: string }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deletion Cancelled</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Account Deletion Cancelled</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${userName},</p>

    <p>Good news! Your account deletion has been cancelled and your account is fully restored.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0;">Your account is now active and all your data is safe.</p>
    </div>

    <p>If you have any questions or concerns about your account, please don't hesitate to contact our support team.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Welcome back!
      <br><br>
      Best regards,<br>The KinderCare Team
    </p>
  </div>
</body>
</html>
  `.trim();
}
