import { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMessageThreads } from "@/server/actions/messages";
import { MessageThreadList } from "@/components/messages/message-thread-list";

export const metadata: Metadata = {
  title: "Messages | KinderCare",
  description: "Your conversations with daycares",
};

export default async function MessagesPage() {
  const threads = await getMessageThreads();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Your conversations with daycare centers
        </p>
      </div>

      {/* Messages list */}
      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No messages yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
            Start a conversation by contacting a daycare you&apos;re interested in.
          </p>
          <Button asChild>
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Find Daycares
            </Link>
          </Button>
        </div>
      ) : (
        <MessageThreadList threads={threads} />
      )}
    </div>
  );
}
