"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { sendMessage } from "@/server/actions/messages";

interface Message {
  id: string;
  content: string;
  senderId: string;
  status: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface Thread {
  id: string;
  subject: string | null;
  daycare: {
    id: string;
    name: string;
    slug: string;
    photo: string | null;
  };
  messages: Message[];
}

interface MessageChatProps {
  thread: Thread;
}

export function MessageChat({ thread }: MessageChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const content = newMessage;
    setNewMessage("");

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: session?.user?.id || "",
      status: "SENT",
      createdAt: new Date(),
      sender: {
        id: session?.user?.id || "",
        name: `${session?.user?.firstName} ${session?.user?.lastName}`,
        avatar: null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const result = await sendMessage(thread.id, content);

    if (!result.success) {
      // Revert on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setNewMessage(content);
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === session?.user?.id;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={message.sender.avatar || undefined}
                    alt={message.sender.name}
                  />
                  <AvatarFallback className="text-xs">
                    {message.sender.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    "max-w-[70%] space-y-1",
                    isOwnMessage ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2",
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground",
                      isOwnMessage ? "text-right" : "text-left"
                    )}
                  >
                    {format(new Date(message.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[80px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="h-[80px] w-[80px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </>
  );
}
