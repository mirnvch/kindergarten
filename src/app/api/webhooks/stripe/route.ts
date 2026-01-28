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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const daycareId = session.metadata?.daycareId;
  const plan = session.metadata?.plan as SubscriptionPlan | undefined;

  if (!daycareId || !plan) {
    console.error("Missing metadata in checkout session");
    return;
  }

  await db.subscription.upsert({
    where: { daycareId },
    create: {
      daycareId,
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
  const daycareId = subscription.metadata?.daycareId;

  if (!daycareId) {
    // Try to find by Stripe subscription ID
    const existingSubscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      console.error("Could not find subscription for:", subscription.id);
      return;
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
        daycareId: subscription.daycareId,
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
  const daycareId = account.metadata?.daycareId;

  if (daycareId) {
    await db.daycare.update({
      where: { id: daycareId },
      data: {
        stripeOnboarded: account.charges_enabled && account.payouts_enabled,
      },
    });
  }
}
