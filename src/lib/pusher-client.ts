"use client";

import PusherClient from "pusher-js";
import { useEffect, useState, useRef, useCallback } from "react";

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    console.warn("Pusher client credentials not configured");
    return null;
  }

  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }

  return pusherClientInstance;
}

// Channel names (duplicated from server for client use)
export function getThreadChannel(threadId: string) {
  return `private-thread-${threadId}`;
}

export function getUserChannel(userId: string) {
  return `private-user-${userId}`;
}

// Event types
export const PUSHER_EVENTS = {
  NEW_MESSAGE: "new-message",
  MESSAGE_READ: "message-read",
  TYPING_START: "typing-start",
  TYPING_STOP: "typing-stop",
  THREAD_UPDATED: "thread-updated",
} as const;

// Types
export interface RealTimeMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: Date;
  attachments?: { id: string; url: string; type: string; name: string }[];
}

export interface ReadReceipt {
  messageIds: string[];
  readBy: string;
  readAt: Date;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
}

// Hook: Subscribe to thread messages
export function useThreadMessages(
  threadId: string,
  onNewMessage: (message: RealTimeMessage) => void,
  onMessageRead?: (data: ReadReceipt) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onNewMessage);
  const readCallbackRef = useRef(onMessageRead);

  useEffect(() => {
    callbackRef.current = onNewMessage;
    readCallbackRef.current = onMessageRead;
  }, [onNewMessage, onMessageRead]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !threadId) return;

    const channelName = getThreadChannel(threadId);
    const channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      setIsConnected(true);
    });

    channel.bind("pusher:subscription_error", () => {
      setIsConnected(false);
    });

    channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: RealTimeMessage) => {
      callbackRef.current({
        ...data,
        createdAt: new Date(data.createdAt),
      });
    });

    channel.bind(PUSHER_EVENTS.MESSAGE_READ, (data: ReadReceipt) => {
      if (readCallbackRef.current) {
        readCallbackRef.current({
          ...data,
          readAt: new Date(data.readAt),
        });
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      setIsConnected(false);
    };
  }, [threadId]);

  return { isConnected };
}

// Hook: Typing indicators
export function useTypingIndicator(threadId: string, currentUserId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !threadId) return;

    const channelName = getThreadChannel(threadId);
    const channel = pusher.subscribe(channelName);

    channel.bind(PUSHER_EVENTS.TYPING_START, (data: TypingIndicator) => {
      if (data.userId === currentUserId) return;

      // Clear existing timeout for this user
      const existingTimeout = typingTimeouts.current.get(data.userId);
      if (existingTimeout) clearTimeout(existingTimeout);

      // Add user to typing list
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });

      // Auto-remove after 3 seconds
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        typingTimeouts.current.delete(data.userId);
      }, 3000);

      typingTimeouts.current.set(data.userId, timeout);
    });

    channel.bind(PUSHER_EVENTS.TYPING_STOP, (data: TypingIndicator) => {
      if (data.userId === currentUserId) return;

      const existingTimeout = typingTimeouts.current.get(data.userId);
      if (existingTimeout) clearTimeout(existingTimeout);
      typingTimeouts.current.delete(data.userId);

      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    return () => {
      // Clear all timeouts
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.current.clear();
      setTypingUsers([]);
    };
  }, [threadId, currentUserId]);

  return { typingUsers };
}

// Hook: Send typing indicator with debounce
export function useSendTypingIndicator(threadId: string) {
  const lastSentRef = useRef<number>(0);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendTyping = useCallback(async () => {
    const now = Date.now();
    // Throttle: only send every 2 seconds
    if (now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;

    // Clear previous stop timeout
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }

    try {
      await fetch("/api/pusher/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, isTyping: true }),
      });

      // Auto-stop after 3 seconds of no typing
      stopTimeoutRef.current = setTimeout(async () => {
        await fetch("/api/pusher/typing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, isTyping: false }),
        });
      }, 3000);
    } catch {
      // Ignore typing errors
    }
  }, [threadId]);

  const stopTyping = useCallback(async () => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    try {
      await fetch("/api/pusher/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, isTyping: false }),
      });
    } catch {
      // Ignore typing errors
    }
  }, [threadId]);

  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
    };
  }, []);

  return { sendTyping, stopTyping };
}

// Hook: Thread list updates
export function useThreadUpdates(
  userId: string,
  onThreadUpdate: (data: { threadId: string; lastMessage?: string; unreadCount?: number }) => void
) {
  const callbackRef = useRef(onThreadUpdate);

  useEffect(() => {
    callbackRef.current = onThreadUpdate;
  }, [onThreadUpdate]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !userId) return;

    const channelName = getUserChannel(userId);
    const channel = pusher.subscribe(channelName);

    channel.bind(PUSHER_EVENTS.THREAD_UPDATED, (data: { threadId: string; lastMessage?: string; unreadCount?: number }) => {
      callbackRef.current(data);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [userId]);
}
