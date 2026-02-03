import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Idempotency check: skip if already processed
    const existingEvent = await db.webhookEvent.findUnique({
      where: { id: event.id },
    });

    if (existingEvent) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Process the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await db.webhookEvent.create({
      data: { id: event.id, type: event.type },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    // Return 500 so Stripe will retry
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const providerId = session.metadata?.providerId;
  const plan = session.metadata?.plan as SubscriptionPlan | undefined;

  if (!providerId || !plan) {
    console.error("Missing metadata in checkout session");
    return;
  }

  await db.subscription.upsert({
    where: { providerId },
    create: {
      providerId,
      plan,
      status: "ACTIVE",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    update: {
      plan,
      status: "ACTIVE",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
    },
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Verify subscription exists in our database
  const existingSubscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSubscription) {
    // Check if this is a new subscription with metadata
    const providerId = subscription.metadata?.providerId;
    if (!providerId) {
      // Throw error so Stripe retries - subscription might not be created yet
      throw new Error(`Subscription not found: ${subscription.id}`);
    }
  }

  const statusMap: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
  };

  const status = statusMap[subscription.status] || "EXPIRED";

  // Access subscription period from the subscription object
  const subAny = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };

  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status,
      currentPeriodStart: subAny.current_period_start
        ? new Date(subAny.current_period_start * 1000)
        : new Date(),
      currentPeriodEnd: subAny.current_period_end
        ? new Date(subAny.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle invoice with optional subscription field
  const invoiceAny = invoice as unknown as {
    subscription?: string;
    amount_paid?: number;
    payment_intent?: string;
  };

  if (!invoiceAny.subscription) return;

  // Record successful payment
  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: invoiceAny.subscription },
  });

  if (subscription) {
    await db.payment.create({
      data: {
        providerId: subscription.providerId,
        amount: (invoiceAny.amount_paid || 0) / 100, // Convert from cents
        status: "SUCCEEDED",
        type: "subscription",
        stripePaymentIntentId: invoiceAny.payment_intent || null,
        platformFee: 0, // No platform fee for subscriptions
      },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as unknown as { subscription?: string };

  if (!invoiceAny.subscription) return;

  await db.subscription.updateMany({
    where: { stripeSubscriptionId: invoiceAny.subscription },
    data: { status: "PAST_DUE" },
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  const providerId = account.metadata?.providerId;

  if (providerId) {
    await db.provider.update({
      where: { id: providerId },
      data: {
        stripeOnboarded: account.charges_enabled && account.payouts_enabled,
      },
    });
  }
}
