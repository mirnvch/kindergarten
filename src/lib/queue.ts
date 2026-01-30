import { Client } from "@upstash/qstash";

// Initialize QStash client (lazy to avoid errors if env vars not set)
let qstashClient: Client | null = null;

function getQStash(): Client | null {
  if (qstashClient) return qstashClient;

  if (!process.env.QSTASH_TOKEN) {
    console.warn("[Queue] QStash not configured, jobs will run synchronously");
    return null;
  }

  qstashClient = new Client({
    token: process.env.QSTASH_TOKEN,
  });

  return qstashClient;
}

export type EmailJob = {
  type: "email";
  to: string;
  subject: string;
  html: string;
};

export type JobPayload = EmailJob;

/**
 * Queue an email to be sent asynchronously
 * Falls back to sync if QStash not configured
 */
export async function queueEmail(job: Omit<EmailJob, "type">): Promise<{ queued: boolean; messageId?: string }> {
  const client = getQStash();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

  if (!client || !baseUrl) {
    // Fallback: return false to indicate sync processing needed
    return { queued: false };
  }

  try {
    const result = await client.publishJSON({
      url: `${baseUrl}/api/queue/email`,
      body: { type: "email", ...job },
      retries: 3,
      // Delay between retries: 10s, 30s, 60s
      callback: undefined,
    });

    return { queued: true, messageId: result.messageId };
  } catch (error) {
    console.error("[Queue] Failed to queue email:", error);
    return { queued: false };
  }
}

/**
 * Queue multiple emails in batch
 */
export async function queueEmailBatch(
  jobs: Omit<EmailJob, "type">[]
): Promise<{ queued: number; failed: number }> {
  const client = getQStash();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

  if (!client || !baseUrl) {
    return { queued: 0, failed: jobs.length };
  }

  let queued = 0;
  let failed = 0;

  // QStash batch endpoint
  const batchSize = 100; // QStash limit per batch
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    try {
      await client.batchJSON(
        batch.map((job) => ({
          url: `${baseUrl}/api/queue/email`,
          body: { type: "email", ...job },
          retries: 3,
        }))
      );
      queued += batch.length;
    } catch (error) {
      console.error("[Queue] Batch failed:", error);
      failed += batch.length;
    }
  }

  return { queued, failed };
}

/**
 * Verify QStash signature for incoming webhooks
 */
export async function verifyQStashSignature(
  signature: string | null,
  body: string
): Promise<boolean> {
  if (!signature || !process.env.QSTASH_CURRENT_SIGNING_KEY) {
    return false;
  }

  try {
    const { Receiver } = await import("@upstash/qstash");
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
    });

    await receiver.verify({ signature, body });
    return true;
  } catch {
    return false;
  }
}
