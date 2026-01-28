import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Missing STRIPE_SECRET_KEY - Stripe functionality will be disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null;

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    priceId: null,
    features: [
      "Basic profile listing",
      "Up to 5 photos",
      "Tour booking",
      "5% platform fee",
    ],
  },
  STARTER: {
    name: "Starter",
    price: 4900, // $49.00 in cents
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      "Up to 20 photos",
      "Priority in search",
      "Basic analytics",
      "4% platform fee",
    ],
  },
  PROFESSIONAL: {
    name: "Professional",
    price: 9900, // $99.00 in cents
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: [
      "Unlimited photos",
      "Featured listing",
      "Advanced analytics",
      "Online payments",
      "3% platform fee",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 19900, // $199.00 in cents
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      "All Professional features",
      "Multi-location support",
      "Dedicated support",
      "Custom integrations",
      "2% platform fee",
    ],
  },
} as const;

export type PlanType = keyof typeof SUBSCRIPTION_PLANS;

export function getPlatformFee(plan: PlanType): number {
  const fees: Record<PlanType, number> = {
    FREE: 0.05,
    STARTER: 0.04,
    PROFESSIONAL: 0.03,
    ENTERPRISE: 0.02,
  };
  return fees[plan];
}
