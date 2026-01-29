"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MessageThread {
  id: string;
  subject: string | null;
  lastMessageAt: Date | null;
  daycare: {
    id: string;
    name: string;
    slug: string;
    photo: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    status: string;
    createdAt: Date;
  } | null;
  unreadCount: number;
}

interface MessageThreadListProps {
  threads: MessageThread[];
}

export function MessageThreadList({ threads }: MessageThreadListProps) {
  return (
    <div className="space-y-2">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function ThreadCard({ thread }: { thread: MessageThread }) {
  const { daycare, lastMessage, unreadCount } = thread;

  return (
    <Link href={`/dashboard/messages/${thread.id}`}>
      <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={daycare.photo || undefined} alt={daycare.name} />
            <AvatarFallback className="text-lg">
              {daycare.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{daycare.name}</h3>
              {lastMessage && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(lastMessage.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>

            {thread.subject && (
              <p className="text-sm font-medium text-muted-foreground truncate">
                {thread.subject}
              </p>
            )}

            {lastMessage && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {lastMessage.content}
              </p>
            )}
          </div>

          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
