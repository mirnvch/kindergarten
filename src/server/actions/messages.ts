"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { triggerNewMessage, triggerMessageRead, triggerThreadUpdate } from "@/lib/pusher";

export async function getMessageThreads() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const threads = await db.messageThread.findMany({
    where: {
      parentId: session.user.id,
      isArchived: false,
    },
    include: {
      daycare: {
        select: {
          id: true,
          name: true,
          slug: true,
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
    daycare: {
      id: thread.daycare.id,
      name: thread.daycare.name,
      slug: thread.daycare.slug,
      photo: thread.daycare.photos[0]?.url || null,
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
      parentId: session.user.id,
    },
    include: {
      daycare: {
        select: {
          id: true,
          name: true,
          slug: true,
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
    daycare: {
      id: thread.daycare.id,
      name: thread.daycare.name,
      slug: thread.daycare.slug,
      photo: thread.daycare.photos[0]?.url || null,
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

  if (!content.trim() && (!attachments || attachments.length === 0)) {
    return { success: false, error: "Message cannot be empty" };
  }

  try {
    // Verify thread belongs to user (parent or daycare staff)
    const thread = await db.messageThread.findFirst({
      where: {
        id: threadId,
        OR: [
          { parentId: session.user.id },
          {
            daycare: {
              staff: {
                some: { userId: session.user.id },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        parentId: true,
        daycareId: true,
        daycare: {
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
        content: content.trim(),
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
      thread.parentId,
      ...thread.daycare.staff.map((s) => s.userId),
    ].filter((id) => id !== session.user.id);

    for (const recipientId of recipientIds) {
      await triggerThreadUpdate(recipientId, threadId, {
        lastMessage: content.trim().slice(0, 100),
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

export async function startNewThread(daycareId: string, subject: string, message: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Check if thread already exists
    let thread = await db.messageThread.findUnique({
      where: {
        daycareId_parentId: {
          daycareId,
          parentId: session.user.id,
        },
      },
    });

    if (!thread) {
      // Create new thread
      thread = await db.messageThread.create({
        data: {
          daycareId,
          parentId: session.user.id,
          subject,
          lastMessageAt: new Date(),
        },
      });
    }

    // Create first message
    await db.message.create({
      data: {
        threadId: thread.id,
        senderId: session.user.id,
        content: message.trim(),
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
