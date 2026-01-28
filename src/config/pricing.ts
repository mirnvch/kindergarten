import { SubscriptionPlan } from "@prisma/client";

export type PricingPlan = {
  name: string;
  price: number;
  stripePriceId: string | null;
  description: string;
  features: string[];
  limits: {
    photos: number;
    programs: number;
    teamMembers: number;
  };
  popular?: boolean;
};

export const PRICING_PLANS: Record<SubscriptionPlan, PricingPlan> = {
  FREE: {
    name: "Free",
    price: 0,
    stripePriceId: null,
    description: "Get started with basic features",
    features: [
      "Basic profile listing",
      "Up to 5 photos",
      "Receive tour requests",
      "Basic messaging",
      "Email notifications",
    ],
    limits: {
      photos: 5,
      programs: 2,
      teamMembers: 1,
    },
  },
  STARTER: {
    name: "Starter",
    price: 49,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    description: "Everything you need to grow",
    features: [
      "Everything in Free",
      "Up to 20 photos",
      "Priority in search results",
      "Analytics dashboard",
      "Custom branding",
      "Waitlist management",
    ],
    limits: {
      photos: 20,
      programs: 5,
      teamMembers: 3,
    },
  },
  PROFESSIONAL: {
    name: "Professional",
    price: 99,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "price_professional",
    description: "Advanced features for scaling",
    features: [
      "Everything in Starter",
      "Unlimited photos",
      "Featured listing badge",
      "Advanced analytics",
      "Payment processing",
      "SMS notifications",
      "API access",
    ],
    limits: {
      photos: -1, // unlimited
      programs: -1,
      teamMembers: 10,
    },
    popular: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 199,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise",
    description: "For large organizations",
    features: [
      "Everything in Professional",
      "Multi-location support",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "Priority support",
      "White-label options",
    ],
    limits: {
      photos: -1,
      programs: -1,
      teamMembers: -1, // unlimited
    },
  },
};

export const PLATFORM_COMMISSION: Record<SubscriptionPlan, number> = {
  FREE: 0.05, // 5%
  STARTER: 0.04, // 4%
  PROFESSIONAL: 0.03, // 3%
  ENTERPRISE: 0.02, // 2%
};

export function getPlanFeature(
  plan: SubscriptionPlan,
  feature: keyof PricingPlan["limits"]
): number {
  return PRICING_PLANS[plan].limits[feature];
}

export function isFeatureUnlimited(
  plan: SubscriptionPlan,
  feature: keyof PricingPlan["limits"]
): boolean {
  return PRICING_PLANS[plan].limits[feature] === -1;
}

export function canUsePaidFeatures(plan: SubscriptionPlan): boolean {
  return plan !== "FREE";
}
