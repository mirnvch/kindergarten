"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function deleteMessage(messageId: string) {
  try {
    const admin = await requireAdmin();

    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { id: true, threadId: true, senderId: true },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    await db.message.delete({
      where: { id: messageId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "MESSAGE_DELETED",
        entityType: "Message",
        entityId: messageId,
        oldData: {
          threadId: message.threadId,
          senderId: message.senderId,
        },
      },
    });

    revalidatePath("/admin/messages");
    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: "Failed to delete message" };
  }
}

export async function deleteThread(threadId: string) {
  try {
    const admin = await requireAdmin();

    const thread = await db.messageThread.findUnique({
      where: { id: threadId },
      select: { id: true, daycareId: true, parentId: true },
    });

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    await db.messageThread.delete({
      where: { id: threadId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "THREAD_DELETED",
        entityType: "MessageThread",
        entityId: threadId,
        oldData: {
          daycareId: thread.daycareId,
          parentId: thread.parentId,
        },
      },
    });

    revalidatePath("/admin/messages");
    return { success: true };
  } catch (error) {
    console.error("Error deleting thread:", error);
    return { success: false, error: "Failed to delete thread" };
  }
}

export async function archiveThread(threadId: string) {
  try {
    const admin = await requireAdmin();

    const thread = await db.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    const newArchived = !thread.isArchived;

    await db.messageThread.update({
      where: { id: threadId },
      data: { isArchived: newArchived },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: newArchived ? "THREAD_ARCHIVED" : "THREAD_UNARCHIVED",
        entityType: "MessageThread",
        entityId: threadId,
        newData: { isArchived: newArchived },
      },
    });

    revalidatePath("/admin/messages");
    return { success: true, isArchived: newArchived };
  } catch (error) {
    console.error("Error archiving thread:", error);
    return { success: false, error: "Failed to archive thread" };
  }
}
