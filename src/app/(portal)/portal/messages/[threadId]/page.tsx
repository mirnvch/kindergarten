import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MessageChat } from "@/components/messages/message-chat";

interface PortalThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export async function generateMetadata({
  params,
}: PortalThreadPageProps): Promise<Metadata> {
  const { threadId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return { title: "Messages | DocConnect Portal" };
  }

  const thread = await getPortalThread(threadId, session.user.id);

  if (!thread) {
    return { title: "Messages | DocConnect Portal" };
  }

  return {
    title: `Chat with ${thread.parentName} | DocConnect Portal`,
    description: `Conversation with ${thread.parentName}`,
  };
}

async function getPortalThread(threadId: string, userId: string) {
  // Get user's daycare
  const providerStaff = await db.providerStaff.findFirst({
    where: {
      userId,
      role: { in: ["owner", "manager"] },
    },
    select: { providerId: true },
  });

  if (!providerStaff) return null;

  // Get thread
  const thread = await db.messageThread.findFirst({
    where: {
      id: threadId,
      providerId: providerStaff.providerId,
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
        take: 100,
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
      },
    },
  });

  if (!thread) return null;

  // Get parent info
  const parent = await db.user.findUnique({
    where: { id: thread.parentId },
    select: { firstName: true, lastName: true },
  });

  // Mark unread messages as read
  await db.message.updateMany({
    where: {
      threadId: thread.id,
      senderId: { not: userId },
      readAt: null,
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  return {
    id: thread.id,
    subject: thread.subject,
    parentName: parent ? `${parent.firstName} ${parent.lastName}` : "Parent",
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
      attachments: msg.attachments?.map((a) => ({
        id: a.id,
        url: a.url,
        type: a.type,
        name: a.name,
      })),
    })),
  };
}

export default async function PortalThreadPage({
  params,
}: PortalThreadPageProps) {
  const { threadId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const thread = await getPortalThread(threadId, session.user.id);

  if (!thread) {
    notFound();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-semibold">{thread.parentName}</h1>
          {thread.subject && (
            <p className="text-sm text-muted-foreground">{thread.subject}</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <MessageChat thread={thread} />
    </div>
  );
}
