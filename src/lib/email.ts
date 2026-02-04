import { Resend } from "resend";
import { queueEmail } from "./queue";

// Lazy initialize Resend to avoid build-time errors
let resend: Resend | null = null;

export function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL || "DocConnect <noreply@docconnect.app>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send email synchronously (blocks until sent)
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const client = getResend();

  if (!client) {
    console.warn("[Email] RESEND_API_KEY not set, skipping email");
    return { success: true, data: { id: "mock" } };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[Email] Exception:", err);
    return { success: false, error: "Failed to send email" };
  }
}

/**
 * Send email asynchronously via queue (returns immediately)
 * Falls back to sync send if queue not configured
 */
export async function sendEmailAsync({ to, subject, html }: Omit<SendEmailOptions, "replyTo">) {
  const recipient = Array.isArray(to) ? to[0] : to;

  // Try to queue
  const { queued } = await queueEmail({ to: recipient, subject, html });

  if (queued) {
    return { success: true, queued: true };
  }

  // Fallback to sync send
  return sendEmail({ to, subject, html });
}

// Email templates

export function bookingConfirmationEmail({
  parentName,
  daycareName,
  date,
  time,
  childName,
  address,
}: {
  parentName: string;
  daycareName: string;
  date: string;
  time: string;
  childName: string;
  address: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed! ✓</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${parentName},</p>

    <p>Your tour at <strong>${daycareName}</strong> has been confirmed!</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
      <p style="margin: 5px 0;"><strong>Child:</strong> ${childName}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${address}</p>
    </div>

    <p>Please arrive 5-10 minutes early. If you need to reschedule, please contact the daycare directly.</p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Booking</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>The DocConnect Team</p>
  </div>
</body>
</html>
  `.trim();
}

export function bookingReminderEmail({
  parentName,
  daycareName,
  date,
  time,
  childName,
  address,
}: {
  parentName: string;
  daycareName: string;
  date: string;
  time: string;
  childName: string;
  address: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tour Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Tour Reminder 🔔</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${parentName},</p>

    <p>This is a friendly reminder that your tour at <strong>${daycareName}</strong> is tomorrow!</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
      <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
      <p style="margin: 5px 0;"><strong>Child:</strong> ${childName}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${address}</p>
    </div>

    <p><strong>Tips for your visit:</strong></p>
    <ul style="padding-left: 20px;">
      <li>Arrive 5-10 minutes early</li>
      <li>Bring any questions you have</li>
      <li>Feel free to bring your child along</li>
    </ul>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings" style="display: inline-block; background: #f5576c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Details</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">See you tomorrow!<br>The DocConnect Team</p>
  </div>
</body>
</html>
  `.trim();
}

export function newMessageEmail({
  recipientName,
  senderName,
  messagePreview,
  threadId,
}: {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  threadId: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Message 💬</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${recipientName},</p>

    <p>You have a new message from <strong>${senderName}</strong>:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4facfe;">
      <p style="margin: 0; color: #555; font-style: italic;">"${messagePreview}"</p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messages/${threadId}" style="display: inline-block; background: #4facfe; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Reply Now</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>The DocConnect Team</p>
  </div>
</body>
</html>
  `.trim();
}

export function welcomeEmail({
  userName,
  role,
}: {
  userName: string;
  role: "PATIENT" | "PROVIDER";
}) {
  const isPatient = role === "PATIENT";
  const dashboardUrl = isPatient
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    : `${process.env.NEXT_PUBLIC_APP_URL}/portal`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to DocConnect</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to DocConnect! 🎉</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${userName},</p>

    <p>Thank you for joining DocConnect! We're excited to have you on board.</p>

    ${isPatient ? `
    <p><strong>As a parent, you can:</strong></p>
    <ul style="padding-left: 20px;">
      <li>Search for daycares in your area</li>
      <li>Book tours and visits</li>
      <li>Message daycare providers directly</li>
      <li>Read and write reviews</li>
    </ul>
    ` : `
    <p><strong>As a daycare owner, you can:</strong></p>
    <ul style="padding-left: 20px;">
      <li>Create and manage your daycare profile</li>
      <li>Receive and manage bookings</li>
      <li>Communicate with parents</li>
      <li>Track analytics and performance</li>
    </ul>
    `}

    <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Go to Dashboard</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">Need help? Reply to this email and we'll be happy to assist.<br><br>Best regards,<br>The DocConnect Team</p>
  </div>
</body>
</html>
  `.trim();
}

export function waitlistSpotAvailableEmail(
  parentName: string,
  daycareName: string,
  daycareSlug: string
) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spot Available!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">A Spot is Available! 🎉</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${parentName},</p>

    <p>Great news! A spot has opened up at <strong>${daycareName}</strong>!</p>

    <p>You were on our waitlist, and we wanted to let you know right away so you can secure this spot for your child.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38ef7d;">
      <p style="margin: 5px 0;"><strong>Next Steps:</strong></p>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>Visit the daycare page</li>
        <li>Contact them to confirm your interest</li>
        <li>Complete the enrollment process</li>
      </ol>
      <p style="margin: 5px 0; color: #666; font-size: 14px;"><em>Note: Spots fill up quickly, so please respond as soon as possible!</em></p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/daycare/${daycareSlug}" style="display: inline-block; background: #38ef7d; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: 600;">View Daycare</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>The DocConnect Team</p>
  </div>
</body>
</html>
  `.trim();
}

export function reviewResponseEmail({
  parentName,
  daycareName,
  responsePreview,
  reviewId,
}: {
  parentName: string;
  daycareName: string;
  responsePreview: string;
  reviewId: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Response to Your Review</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #333; margin: 0; font-size: 24px;">Response to Your Review</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${parentName},</p>

    <p><strong>${daycareName}</strong> has responded to your review:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #a8edea;">
      <p style="margin: 0; color: #555; font-style: italic;">"${responsePreview}"</p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reviews/${reviewId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Full Response</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>The DocConnect Team</p>
  </div>
</body>
</html>
  `.trim();
}

export function newTrustedDeviceEmail({
  userName,
  deviceName,
  ipAddress,
  location,
}: {
  userName: string;
  deviceName: string;
  ipAddress: string;
  location?: string;
}) {
  const securitySettingsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/security`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Trusted Device Added</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Trusted Device Added</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${userName},</p>

    <p>A new device has been added to your trusted devices list. This device can now skip two-factor authentication for the next 30 days.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <p style="margin: 5px 0;"><strong>Device:</strong> ${deviceName}</p>
      <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
      ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ""}
      <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <p style="color: #666;">If you did not add this device, please review your security settings immediately and remove any unrecognized devices.</p>

    <a href="${securitySettingsUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Review Security Settings</a>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>The DocConnect Team</p>
  </div>
</body>
</html>
  `.trim();
}
