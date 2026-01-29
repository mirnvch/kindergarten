"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  sendEmail,
  bookingConfirmationEmail,
  bookingReminderEmail,
  newMessageEmail,
  welcomeEmail,
  reviewResponseEmail,
} from "@/lib/email";

// ==================== IN-APP NOTIFICATIONS ====================

export async function getUnreadNotificationsCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  return db.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });
}

export async function getNotifications(limit = 10) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db.notification.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function markNotificationAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.notification.update({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
      data: {
        readAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/portal");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark notification as read" };
  }
}

export async function markAllNotificationsAsRead() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/portal");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark notifications as read" };
  }
}

export async function deleteNotification(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.notification.delete({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/portal");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete notification" };
  }
}

// ==================== CREATE NOTIFICATIONS ====================

type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "message_received"
  | "review_received"
  | "review_response"
  | "enrollment_status"
  | "welcome";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null>;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });
    return { success: true };
  } catch {
    console.error("[Notification] Failed to create:", input);
    return { success: false };
  }
}

// ==================== EMAIL NOTIFICATIONS ====================

export async function sendBookingConfirmation(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      parent: true,
      daycare: true,
      child: true,
    },
  });

  if (!booking || !booking.scheduledAt) {
    return { success: false, error: "Booking not found" };
  }

  const dateStr = booking.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = booking.scheduledAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Create in-app notification
  await createNotification({
    userId: booking.parentId,
    type: "booking_confirmed",
    title: "Booking Confirmed",
    body: `Your tour at ${booking.daycare.name} on ${dateStr} has been confirmed.`,
    data: { bookingId: booking.id, daycareId: booking.daycareId },
  });

  // Send email
  const html = bookingConfirmationEmail({
    parentName: booking.parent.firstName || "Parent",
    daycareName: booking.daycare.name,
    date: dateStr,
    time: timeStr,
    childName: booking.child?.firstName || "your child",
    address: booking.daycare.address,
  });

  return sendEmail({
    to: booking.parent.email,
    subject: `Booking Confirmed - ${booking.daycare.name}`,
    html,
  });
}

export async function sendBookingReminder(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      parent: true,
      daycare: true,
      child: true,
    },
  });

  if (!booking || !booking.scheduledAt) {
    return { success: false, error: "Booking not found" };
  }

  const dateStr = booking.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = booking.scheduledAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Create in-app notification
  await createNotification({
    userId: booking.parentId,
    type: "booking_reminder",
    title: "Tour Tomorrow",
    body: `Reminder: Your tour at ${booking.daycare.name} is tomorrow at ${timeStr}.`,
    data: { bookingId: booking.id, daycareId: booking.daycareId },
  });

  // Send email
  const html = bookingReminderEmail({
    parentName: booking.parent.firstName || "Parent",
    daycareName: booking.daycare.name,
    date: dateStr,
    time: timeStr,
    childName: booking.child?.firstName || "your child",
    address: booking.daycare.address,
  });

  return sendEmail({
    to: booking.parent.email,
    subject: `Reminder: Tour Tomorrow at ${booking.daycare.name}`,
    html,
  });
}

export async function sendNewMessageNotification(
  messageId: string,
  recipientId: string
) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: {
      sender: true,
      thread: true,
    },
  });

  if (!message) return { success: false, error: "Message not found" };

  const recipient = await db.user.findUnique({
    where: { id: recipientId },
  });

  if (!recipient) return { success: false, error: "Recipient not found" };

  // Check notification preferences
  const prefs = await db.notificationPreference.findUnique({
    where: { userId: recipientId },
  });

  // Create in-app notification (always)
  await createNotification({
    userId: recipientId,
    type: "message_received",
    title: "New Message",
    body: `${message.sender.firstName || "Someone"} sent you a message.`,
    data: { threadId: message.threadId, messageId: message.id },
  });

  // Send email only if enabled
  if (prefs?.emailMessages !== false) {
    const preview =
      message.content.length > 100
        ? message.content.slice(0, 100) + "..."
        : message.content;

    const html = newMessageEmail({
      recipientName: recipient.firstName || "User",
      senderName: message.sender.firstName || "Someone",
      messagePreview: preview,
      threadId: message.threadId,
    });

    return sendEmail({
      to: recipient.email,
      subject: `New message from ${message.sender.firstName || "KinderCare"}`,
      html,
    });
  }

  return { success: true };
}

export async function sendWelcomeEmail(
  userId: string,
  role: "PARENT" | "DAYCARE_OWNER"
) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) return { success: false, error: "User not found" };

  // Create in-app notification
  await createNotification({
    userId,
    type: "welcome",
    title: "Welcome to KinderCare!",
    body:
      role === "PARENT"
        ? "Start searching for the perfect daycare for your family."
        : "Set up your daycare profile to start receiving bookings.",
    data: { role },
  });

  // Send email
  const html = welcomeEmail({
    userName: user.firstName || "there",
    role,
  });

  return sendEmail({
    to: user.email,
    subject: "Welcome to KinderCare!",
    html,
  });
}

export async function sendReviewResponseNotification(reviewId: string) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: {
      user: true,
      daycare: true,
    },
  });

  if (!review || !review.response) {
    return { success: false, error: "Review or response not found" };
  }

  // Create in-app notification
  await createNotification({
    userId: review.userId,
    type: "review_response",
    title: "Response to Your Review",
    body: `${review.daycare.name} responded to your review.`,
    data: { reviewId: review.id, daycareId: review.daycareId },
  });

  // Send email
  const preview =
    review.response.length > 150
      ? review.response.slice(0, 150) + "..."
      : review.response;

  const html = reviewResponseEmail({
    parentName: review.user.firstName || "Parent",
    daycareName: review.daycare.name,
    responsePreview: preview,
    reviewId: review.id,
  });

  return sendEmail({
    to: review.user.email,
    subject: `${review.daycare.name} responded to your review`,
    html,
  });
}

// ==================== NOTIFICATION PREFERENCES ====================

export async function getNotificationPreferences() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const prefs = await db.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  // Return defaults if no preferences exist
  return (
    prefs || {
      emailBookings: true,
      emailMessages: true,
      emailMarketing: false,
      pushEnabled: false,
    }
  );
}

export async function updateNotificationPreferences(data: {
  emailBookings?: boolean;
  emailMessages?: boolean;
  emailMarketing?: boolean;
  pushEnabled?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.notificationPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data,
      },
      update: data,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/portal/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update preferences" };
  }
}

// ==================== SCHEDULED REMINDERS ====================

// This function should be called by a cron job (e.g., Vercel Cron)
export async function sendScheduledReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // Find bookings scheduled for tomorrow
  const bookings = await db.booking.findMany({
    where: {
      scheduledAt: {
        gte: tomorrow,
        lt: dayAfter,
      },
      status: "CONFIRMED",
    },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    bookings.map((b) => sendBookingReminder(b.id))
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[Reminders] Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}
