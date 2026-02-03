"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { triggerNewMessage, triggerThreadUpdate } from "@/lib/pusher";
import { rateLimit } from "@/lib/rate-limit";

// Security constants
const MAX_MESSAGE_LENGTH = 5000; // 5KB max message
const MAX_SUBJECT_LENGTH = 200;
const MAX_ATTACHMENTS = 5;
const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain"];
const ALLOWED_URL_PREFIXES = [
  "https://bahutqmwxqgsyqwsghqe.supabase.co/", // Supabase Storage
  "https://utfs.io/", // UploadThing
];

export async function getMessageThreads() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const threads = await db.messageThread.findMany({
    where: {
      patientId: session.user.id,
      isArchived: false,
    },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          specialty: true,
          photos: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          senderId: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return threads.map((thread) => ({
    id: thread.id,
    subject: thread.subject,
    lastMessageAt: thread.lastMessageAt,
    provider: {
      id: thread.provider.id,
      name: thread.provider.name,
      slug: thread.provider.slug,
      specialty: thread.provider.specialty,
      photo: thread.provider.photos[0]?.url || null,
    },
    lastMessage: thread.messages[0] || null,
    unreadCount: 0, // TODO: calculate unread count
  }));
}

export async function getThreadMessages(
  threadId: string,
  options?: { cursor?: string; limit?: number }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const limit = options?.limit || 50;
  const cursor = options?.cursor;

  // First, get thread info
  const thread = await db.messageThread.findFirst({
    where: {
      id: threadId,
      patientId: session.user.id,
    },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          specialty: true,
          photos: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });

  if (!thread) {
    return null;
  }

  // Fetch messages with pagination (cursor-based for infinite scroll)
  const messages = await db.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" }, // Newest first for cursor pagination
    take: limit + 1, // Fetch one extra to check if there are more
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Skip the cursor itself
    }),
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      attachments: {
        select: {
          id: true,
          url: true,
          type: true,
          name: true,
        },
      },
    },
  });

  // Check if there are more messages
  const hasMore = messages.length > limit;
  const messageSlice = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? messageSlice[messageSlice.length - 1]?.id : null;

  // Reverse to show oldest first in UI (but we fetched newest first for cursor)
  const orderedMessages = messageSlice.reverse();

  // Mark unread messages as read
  await db.message.updateMany({
    where: {
      threadId: thread.id,
      senderId: { not: session.user.id },
      status: { not: "READ" },
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  return {
    id: thread.id,
    subject: thread.subject,
    provider: {
      id: thread.provider.id,
      name: thread.provider.name,
      slug: thread.provider.slug,
      specialty: thread.provider.specialty,
      photo: thread.provider.photos[0]?.url || null,
    },
    messages: orderedMessages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      status: msg.status,
      createdAt: msg.createdAt,
      sender: {
        id: msg.sender.id,
        name: `${msg.sender.firstName} ${msg.sender.lastName}`,
        avatar: msg.sender.avatarUrl,
      },
      attachments: msg.attachments?.map((a) => ({
        id: a.id,
        url: a.url,
        type: a.type,
        name: a.name,
      })),
    })),
    pagination: {
      hasMore,
      nextCursor,
    },
  };
}

export async function sendMessage(
  threadId: string,
  content: string,
  attachments?: { url: string; type: string; name: string }[]
) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Rate limiting
  const rateLimitResult = await rateLimit(session.user.id, "message");
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many messages. Please wait ${retryAfter} seconds.`
    };
  }

  // Content validation
  const trimmedContent = content.trim();
  if (!trimmedContent && (!attachments || attachments.length === 0)) {
    return { success: false, error: "Message cannot be empty" };
  }

  if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
    };
  }

  // Attachment validation
  if (attachments && attachments.length > MAX_ATTACHMENTS) {
    return { success: false, error: `Maximum ${MAX_ATTACHMENTS} attachments allowed.` };
  }

  if (attachments) {
    for (const att of attachments) {
      // Validate URL prefix (only allow trusted storage)
      const isAllowedUrl = ALLOWED_URL_PREFIXES.some(prefix => att.url.startsWith(prefix));
      if (!isAllowedUrl) {
        return { success: false, error: "Invalid attachment URL" };
      }
      // Validate file type
      if (!ALLOWED_ATTACHMENT_TYPES.includes(att.type)) {
        return { success: false, error: `File type ${att.type} not allowed` };
      }
    }
  }

  try {
    // Verify thread belongs to user (patient or provider staff)
    const thread = await db.messageThread.findFirst({
      where: {
        id: threadId,
        OR: [
          { patientId: session.user.id },
          {
            provider: {
              staff: {
                some: { userId: session.user.id },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        provider: {
          select: {
            staff: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    // Create message with attachments
    const message = await db.message.create({
      data: {
        threadId,
        senderId: session.user.id,
        content: trimmedContent,
        status: "SENT",
        ...(attachments && attachments.length > 0 && {
          attachments: {
            create: attachments.map((att) => ({
              url: att.url,
              type: att.type,
              name: att.name,
            })),
          },
        }),
      },
      include: {
        attachments: true,
      },
    });

    // Update thread lastMessageAt
    await db.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    // Trigger real-time event
    const senderName = `${session.user.firstName} ${session.user.lastName}`;
    await triggerNewMessage(threadId, {
      id: message.id,
      content: message.content,
      senderId: session.user.id,
      senderName,
      senderAvatar: null,
      createdAt: message.createdAt,
      attachments: message.attachments?.map((a) => ({
        id: a.id,
        url: a.url,
        type: a.type,
        name: a.name,
      })),
    });

    // Notify other party about new message in thread list
    const recipientIds = [
      thread.patientId,
      ...thread.provider.staff.map((s) => s.userId),
    ].filter((id) => id !== session.user.id);

    for (const recipientId of recipientIds) {
      await triggerThreadUpdate(recipientId, threadId, {
        lastMessage: trimmedContent.slice(0, 100),
      });
    }

    revalidatePath("/dashboard/messages");
    revalidatePath("/portal/messages");

    return { success: true, data: message };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

export async function startNewThread(providerId: string, subject: string, message: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Rate limiting for thread creation
  const rateLimitResult = await rateLimit(session.user.id, "thread");
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many requests. Please wait ${retryAfter} seconds.`
    };
  }

  // Validate inputs
  const trimmedSubject = subject.trim().slice(0, MAX_SUBJECT_LENGTH);
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { success: false, error: "Message cannot be empty" };
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
    };
  }

  // Validate providerId format (CUID)
  if (!/^c[a-z0-9]{24}$/.test(providerId)) {
    return { success: false, error: "Invalid provider ID" };
  }

  try {
    // Check if thread already exists
    let thread = await db.messageThread.findUnique({
      where: {
        providerId_patientId: {
          providerId,
          patientId: session.user.id,
        },
      },
    });

    if (!thread) {
      // Verify provider exists and is active
      const provider = await db.provider.findUnique({
        where: { id: providerId },
        select: { id: true, status: true },
      });

      if (!provider || provider.status !== "APPROVED") {
        return { success: false, error: "Provider not found or inactive" };
      }

      // Create new thread
      thread = await db.messageThread.create({
        data: {
          providerId,
          patientId: session.user.id,
          subject: trimmedSubject || null,
          lastMessageAt: new Date(),
        },
      });
    }

    // Create first message
    await db.message.create({
      data: {
        threadId: thread.id,
        senderId: session.user.id,
        content: trimmedMessage,
        status: "SENT",
      },
    });

    revalidatePath("/dashboard/messages");

    return { success: true, data: { threadId: thread.id } };
  } catch (error) {
    console.error("Error starting thread:", error);
    return { success: false, error: "Failed to start conversation" };
  }
}
