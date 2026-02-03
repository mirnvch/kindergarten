import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateChannel, getUserChannel } from "@/lib/pusher";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // Validate channel access
    const isAuthorized = await validateChannelAccess(
      channelName,
      session.user.id,
      session.user.role
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Channel access denied" },
        { status: 403 }
      );
    }

    const authResponse = authenticateChannel(socketId, channelName, session.user.id);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

async function validateChannelAccess(
  channelName: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  // User's own channel
  if (channelName === getUserChannel(userId)) {
    return true;
  }

  // Thread channel - verify user has access to thread
  if (channelName.startsWith("private-thread-")) {
    const threadId = channelName.replace("private-thread-", "");

    // Check if user is patient of thread
    const thread = await db.messageThread.findFirst({
      where: {
        id: threadId,
        patientId: userId,
      },
    });

    if (thread) return true;

    // Check if user is provider owner/staff of thread
    if (userRole === "PROVIDER" || userRole === "CLINIC_STAFF") {
      const providerThread = await db.messageThread.findFirst({
        where: {
          id: threadId,
          provider: {
            staff: {
              some: { userId },
            },
          },
        },
      });

      if (providerThread) return true;
    }

    // Admin can access all
    if (userRole === "ADMIN") return true;
  }

  return false;
}
