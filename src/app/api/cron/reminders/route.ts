import { NextResponse } from "next/server";
import { sendScheduledReminders } from "@/server/actions/notifications";

// Vercel Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendScheduledReminders();

    return NextResponse.json({
      success: true,
      message: `Sent ${result.sent} reminders, ${result.failed} failed`,
    });
  } catch (error) {
    console.error("[Cron] Error sending reminders:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

// Configure Vercel Cron to run daily at 9 AM UTC
export const dynamic = "force-dynamic";
