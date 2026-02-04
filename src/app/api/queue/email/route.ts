import { NextRequest, NextResponse } from "next/server";
import { verifyQStashSignature, type EmailJob } from "@/lib/queue";
import { getResend } from "@/lib/email";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("upstash-signature");
  const body = await request.text();

  // Verify signature in production
  if (process.env.NODE_ENV === "production") {
    const isValid = await verifyQStashSignature(signature, body);
    if (!isValid) {
      console.error("[Queue/Email] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let job: EmailJob;
  try {
    job = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (job.type !== "email") {
    return NextResponse.json({ error: "Invalid job type" }, { status: 400 });
  }

  const resend = getResend();
  if (!resend) {
    console.error("[Queue/Email] Resend not configured");
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "DocConnect <noreply@docconnect.com>",
      to: job.to,
      subject: job.subject,
      html: job.html,
    });

    if (error) {
      console.error("[Queue/Email] Resend error:", error);
      // Return 500 to trigger QStash retry
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Queue/Email] Failed to send:", error);
    // Return 500 to trigger QStash retry
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
