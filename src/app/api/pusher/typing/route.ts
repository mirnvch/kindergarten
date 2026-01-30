import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { triggerTyping } from "@/lib/pusher";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, isTyping } = body;

    if (!threadId || typeof isTyping !== "boolean") {
      return NextResponse.json(
        { error: "Missing threadId or isTyping" },
        { status: 400 }
      );
    }

    // Verify user has access to thread
    const thread = await db.messageThread.findFirst({
      where: {
        id: threadId,
        OR: [
          { parentId: session.user.id },
          {
            daycare: {
              staff: {
                some: { userId: session.user.id },
              },
            },
          },
        ],
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const userName = `${session.user.firstName} ${session.user.lastName}`;

    await triggerTyping(threadId, session.user.id, userName, isTyping);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing indicator error:", error);
    return NextResponse.json(
      { error: "Failed to send typing indicator" },
      { status: 500 }
    );
  }
}
