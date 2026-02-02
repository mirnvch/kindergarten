import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThreadMessages } from "@/server/actions/messages";
import { MessageChat } from "@/components/messages/message-chat";

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export async function generateMetadata({
  params,
}: ThreadPageProps): Promise<Metadata> {
  const { threadId } = await params;
  const thread = await getThreadMessages(threadId);

  if (!thread) {
    return { title: "Messages | DocConnect" };
  }

  return {
    title: `Chat with ${thread.provider.name} | DocConnect`,
    description: `Conversation with ${thread.provider.name}`,
  };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  const thread = await getThreadMessages(threadId);

  if (!thread) {
    notFound();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-semibold">{thread.provider.name}</h1>
          {thread.subject && (
            <p className="text-sm text-muted-foreground">{thread.subject}</p>
          )}
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/provider/${thread.provider.slug}`}>View Provider</Link>
          </Button>
        </div>
      </div>

      {/* Chat area */}
      <MessageChat thread={thread} />
    </div>
  );
}
