import Pusher from "pusher";

// Server-side Pusher instance (singleton)
let pusherInstance: Pusher | null = null;

function getPusher(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.PUSHER_CLUSTER
  ) {
    console.warn("Pusher credentials not configured - real-time features disabled");
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }

  return pusherInstance;
}

// Channel names
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

// Trigger events
export async function triggerNewMessage(
  threadId: string,
  message: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderAvatar: string | null;
    createdAt: Date;
    attachments?: { id: string; url: string; type: string; name: string }[];
  }
) {
  const pusher = getPusher();
  if (!pusher) return;

  await pusher.trigger(getThreadChannel(threadId), PUSHER_EVENTS.NEW_MESSAGE, message);
}

export async function triggerMessageRead(
  threadId: string,
  data: { messageIds: string[]; readBy: string; readAt: Date }
) {
  const pusher = getPusher();
  if (!pusher) return;

  await pusher.trigger(getThreadChannel(threadId), PUSHER_EVENTS.MESSAGE_READ, data);
}

export async function triggerTyping(
  threadId: string,
  userId: string,
  userName: string,
  isTyping: boolean
) {
  const pusher = getPusher();
  if (!pusher) return;

  const event = isTyping ? PUSHER_EVENTS.TYPING_START : PUSHER_EVENTS.TYPING_STOP;
  await pusher.trigger(getThreadChannel(threadId), event, { userId, userName });
}

export async function triggerThreadUpdate(
  userId: string,
  threadId: string,
  data: { lastMessage?: string; unreadCount?: number }
) {
  const pusher = getPusher();
  if (!pusher) return;

  await pusher.trigger(getUserChannel(userId), PUSHER_EVENTS.THREAD_UPDATED, {
    threadId,
    ...data,
  });
}

// Auth for private channels
export function authenticateChannel(
  socketId: string,
  channelName: string,
  userId: string
) {
  const pusher = getPusher();
  if (!pusher) {
    throw new Error("Pusher not configured");
  }

  return pusher.authorizeChannel(socketId, channelName, {
    user_id: userId,
  });
}

export { getPusher };
