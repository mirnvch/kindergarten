"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, SUBSCRIPTION_PLANS, type PlanType } from "@/lib/stripe";

export async function createCheckoutSession(plan: PlanType) {
  if (!stripe) {
    return { error: "Stripe is not configured" };
  }

  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const planData = SUBSCRIPTION_PLANS[plan];
  if (!planData.priceId) {
    return { error: "Invalid plan" };
  }

  // Get the daycare for this user
  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId: session.user.id, role: "owner" },
    include: { daycare: true },
  });

  if (!daycareStaff) {
    return { error: "Daycare not found" };
  }

  const daycare = daycareStaff.daycare;

  // Check if daycare already has a Stripe customer
  let stripeCustomerId: string | null = null;

  const existingSubscription = await db.subscription.findUnique({
    where: { daycareId: daycare.id },
  });

  if (existingSubscription?.stripeCustomerId) {
    stripeCustomerId = existingSubscription.stripeCustomerId;
  } else {
    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: daycare.email,
      name: daycare.name,
      metadata: {
        daycareId: daycare.id,
      },
    });
    stripeCustomerId = customer.id;
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: planData.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/billing?canceled=true`,
    metadata: {
      daycareId: daycare.id,
      plan: plan,
    },
  });

  if (!checkoutSession.url) {
    return { error: "Failed to create checkout session" };
  }

  redirect(checkoutSession.url);
}

export async function createCustomerPortalSession() {
  if (!stripe) {
    return { error: "Stripe is not configured" };
  }

  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  // Get subscription with Stripe customer ID
  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId: session.user.id, role: "owner" },
    include: {
      daycare: {
        include: { subscription: true },
      },
    },
  });

  if (!daycareStaff?.daycare.subscription?.stripeCustomerId) {
    return { error: "No subscription found" };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: daycareStaff.daycare.subscription.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/billing`,
  });

  redirect(portalSession.url);
}

export async function getSubscriptionStatus() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId: session.user.id, role: "owner" },
    include: {
      daycare: {
        include: { subscription: true },
      },
    },
  });

  if (!daycareStaff) {
    return null;
  }

  return daycareStaff.daycare.subscription;
}

// Stripe Connect for daycare to receive payments

export async function createConnectAccount() {
  if (!stripe) {
    return { error: "Stripe is not configured" };
  }

  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId: session.user.id, role: "owner" },
    include: { daycare: true },
  });

  if (!daycareStaff) {
    return { error: "Daycare not found" };
  }

  const daycare = daycareStaff.daycare;

  // Check if already has a Stripe account
  if (daycare.stripeAccountId) {
    // Create account link for onboarding continuation
    const accountLink = await stripe.accountLinks.create({
      account: daycare.stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/payments`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/payments?success=true`,
      type: "account_onboarding",
    });

    redirect(accountLink.url);
  }

  // Create new Connect account
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: daycare.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "company",
    business_profile: {
      name: daycare.name,
      mcc: "8351", // Child day care services
    },
    metadata: {
      daycareId: daycare.id,
    },
  });

  // Save account ID to database
  await db.daycare.update({
    where: { id: daycare.id },
    data: { stripeAccountId: account.id },
  });

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/payments`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/payments?success=true`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}

export async function getConnectAccountStatus() {
  if (!stripe) {
    return { configured: false };
  }

  const session = await auth();
  if (!session?.user) {
    return { configured: false };
  }

  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId: session.user.id, role: "owner" },
    include: { daycare: true },
  });

  if (!daycareStaff?.daycare.stripeAccountId) {
    return { configured: false };
  }

  const account = await stripe.accounts.retrieve(
    daycareStaff.daycare.stripeAccountId
  );

  return {
    configured: true,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}
