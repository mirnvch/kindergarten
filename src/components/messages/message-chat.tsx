"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Send, Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { sendMessage } from "@/server/actions/messages";
import {
  useThreadMessages,
  useTypingIndicator,
  useSendTypingIndicator,
  type RealTimeMessage,
} from "@/lib/pusher-client";

interface Attachment {
  id: string;
  url: string;
  type: string;
  name: string;
}

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
  attachments?: Attachment[];
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = session?.user?.id || "";

  // Real-time hooks
  const { typingUsers } = useTypingIndicator(thread.id, currentUserId);
  const { sendTyping, stopTyping } = useSendTypingIndicator(thread.id);

  // Handle new real-time messages
  const handleNewMessage = useCallback(
    (rtMessage: RealTimeMessage) => {
      // Don't add own messages (we already have them via optimistic update)
      if (rtMessage.senderId === currentUserId) return;

      const newMsg: Message = {
        id: rtMessage.id,
        content: rtMessage.content,
        senderId: rtMessage.senderId,
        status: "SENT",
        createdAt: new Date(rtMessage.createdAt),
        sender: {
          id: rtMessage.senderId,
          name: rtMessage.senderName,
          avatar: rtMessage.senderAvatar,
        },
        attachments: rtMessage.attachments,
      };

      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    },
    [currentUserId]
  );

  const { isConnected } = useThreadMessages(thread.id, handleNewMessage);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update messages when thread changes
  useEffect(() => {
    setMessages(thread.messages);
  }, [thread.messages]);

  const handleSend = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0) || isSending) return;

    setIsSending(true);
    stopTyping();

    const content = newMessage;
    setNewMessage("");

    // Upload files if any
    let uploadedAttachments: { url: string; type: string; name: string }[] = [];
    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        uploadedAttachments = await uploadFiles(pendingFiles);
        setPendingFiles([]);
      } catch {
        setNewMessage(content);
        setIsSending(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: currentUserId,
      status: "SENT",
      createdAt: new Date(),
      sender: {
        id: currentUserId,
        name: `${session?.user?.firstName} ${session?.user?.lastName}`,
        avatar: session?.user?.image || null,
      },
      attachments: uploadedAttachments.map((a, i) => ({
        id: `temp-att-${i}`,
        ...a,
      })),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const result = await sendMessage(
      thread.id,
      content,
      uploadedAttachments.length > 0 ? uploadedAttachments : undefined
    );

    if (!result.success) {
      // Revert on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setNewMessage(content);
    } else if (result.data) {
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id
            ? {
                ...m,
                id: result.data!.id,
                attachments: result.data!.attachments?.map((a) => ({
                  id: a.id,
                  url: a.url,
                  type: a.type,
                  name: a.name,
                })),
              }
            : m
        )
      );
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    sendTyping();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024); // 10MB max
    setPendingFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Connection status */}
      {!isConnected && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs px-3 py-1 text-center">
          Connecting to real-time updates...
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId;

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
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((att) => (
                          <AttachmentPreview key={att.id} attachment={att} />
                        ))}
                      </div>
                    )}
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

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">
                {typingUsers[0].userName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="border-t py-2 flex flex-wrap gap-2">
          {pendingFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm"
            >
              {file.type.startsWith("image/") ? (
                <ImageIcon className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removePendingFile(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || pendingFiles.length >= 5}
            className="shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[80px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={
              (!newMessage.trim() && pendingFiles.length === 0) ||
              isSending ||
              isUploading
            }
            size="icon"
            className="h-[80px] w-[80px]"
          >
            {isSending || isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </>
  );
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.type.startsWith("image/");

  if (isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-w-[200px] max-h-[200px] rounded object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-background/50 rounded px-2 py-1 text-xs hover:bg-background/80"
    >
      <FileText className="h-4 w-4" />
      <span className="truncate max-w-[150px]">{attachment.name}</span>
    </a>
  );
}

// Simple file upload (to be replaced with actual storage)
async function uploadFiles(
  files: File[]
): Promise<{ url: string; type: string; name: string }[]> {
  const results: { url: string; type: string; name: string }[] = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    results.push({
      url: data.url,
      type: file.type,
      name: file.name,
    });
  }

  return results;
}
