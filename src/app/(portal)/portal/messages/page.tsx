import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { BulkMessageDialog } from "@/components/portal/bulk-message-dialog";
import { getBulkMessageStats } from "@/server/actions/bulk-messaging";

export const metadata: Metadata = {
  title: "Messages | DocConnect Portal",
  description: "Manage your conversations with parents",
};

export default async function PortalMessagesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get daycare
  const providerStaff = await db.providerStaff.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["owner", "manager"] },
    },
    include: { daycare: true },
  });

  if (!providerStaff) {
    redirect("/portal");
  }

  // Get message threads
  const threads = await db.messageThread.findMany({
    where: {
      providerId: providerStaff.daycare.id,
      isArchived: false,
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  // Get parent info for each thread
  const parentIds = threads.map((t) => t.parentId);
  const parents = await db.user.findMany({
    where: { id: { in: parentIds } },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  });
  const parentMap = new Map(parents.map((p) => [p.id, p]));

  // Count unread messages
  const unreadCounts = await db.message.groupBy({
    by: ["threadId"],
    where: {
      thread: { providerId: providerStaff.daycare.id },
      readAt: null,
      senderId: { not: session.user.id },
    },
    _count: true,
  });
  const unreadMap = new Map(unreadCounts.map((u) => [u.threadId, u._count]));

  // Get bulk messaging stats
  const bulkStats = await getBulkMessageStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Conversations with parents
          </p>
        </div>
        {bulkStats && (
          <BulkMessageDialog
            hasBulkMessaging={bulkStats.hasBulkMessaging}
            counts={bulkStats.counts}
          />
        )}
      </div>

      {/* Message Threads */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {threads.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No messages yet</h3>
              <p className="text-muted-foreground">
                When parents send you messages, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread) => {
                const parent = parentMap.get(thread.parentId);
                const lastMessage = thread.messages[0];
                const unread = unreadMap.get(thread.id) || 0;

                return (
                  <Link
                    key={thread.id}
                    href={`/portal/messages/${thread.id}`}
                    className="flex items-center gap-4 py-4 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {parent ? getInitials(parent.firstName, parent.lastName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {parent ? `${parent.firstName} ${parent.lastName}` : "Unknown"}
                        </p>
                        {unread > 0 && (
                          <Badge variant="default" className="h-5 px-1.5">
                            {unread}
                          </Badge>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {lastMessage.sender.id === session.user?.id ? "You: " : ""}
                          {lastMessage.content.slice(0, 50)}
                          {lastMessage.content.length > 50 ? "..." : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {lastMessage && (
                        <span className="text-xs">
                          {new Date(lastMessage.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
