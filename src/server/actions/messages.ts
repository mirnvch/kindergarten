"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

export async function getThreadMessages(threadId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

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
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!thread) {
    return null;
  }

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
    messages: thread.messages.map((msg) => ({
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
    })),
  };
}

export async function sendMessage(threadId: string, content: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { success: false, error: "Message cannot be empty" };
  }

  try {
    // Verify thread belongs to user
    const thread = await db.messageThread.findFirst({
      where: {
        id: threadId,
        parentId: session.user.id,
      },
    });

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    // Create message
    const message = await db.message.create({
      data: {
        threadId,
        senderId: session.user.id,
        content: content.trim(),
        status: "SENT",
      },
    });

    // Update thread lastMessageAt
    await db.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    revalidatePath("/dashboard/messages");

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
