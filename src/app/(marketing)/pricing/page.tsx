import { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRICING_PLANS, PLATFORM_COMMISSION } from "@/config/pricing";
import { SubscriptionPlan } from "@prisma/client";

export const metadata: Metadata = {
  title: "Pricing | DocConnect",
  description: "Simple, transparent pricing for healthcare providers",
};

const planOrder: SubscriptionPlan[] = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that works for your practice. Start free and upgrade as
          you grow.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {planOrder.map((planKey) => {
          const plan = PRICING_PLANS[planKey];
          const commission = PLATFORM_COMMISSION[planKey];

          return (
            <Card
              key={planKey}
              className={plan.popular ? "border-primary shadow-lg relative" : "relative"}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="pt-8">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{Math.round(commission * 100)}% platform fee</span>
                  </li>
                </ul>

                <div className="text-xs text-muted-foreground mb-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Photos:</span>
                    <span>{plan.limits.photos === -1 ? "Unlimited" : plan.limits.photos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Programs:</span>
                    <span>{plan.limits.programs === -1 ? "Unlimited" : plan.limits.programs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Team members:</span>
                    <span>{plan.limits.teamMembers === -1 ? "Unlimited" : plan.limits.teamMembers}</span>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  <Link href={planKey === "ENTERPRISE" ? "/contact" : "/register/provider"}>
                    {planKey === "FREE" ? "Get Started" : planKey === "ENTERPRISE" ? "Contact Sales" : "Start Free Trial"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-12 space-y-2">
        <p className="text-muted-foreground">
          All paid plans include a 14-day free trial. No credit card required.
        </p>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/portal/billing" className="text-primary hover:underline">
            Manage your subscription
          </Link>
        </p>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-20">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Can I change plans later?</h3>
            <p className="text-muted-foreground text-sm">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground text-sm">
              We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Is there a contract or commitment?</h3>
            <p className="text-muted-foreground text-sm">
              No contracts or long-term commitments. You can cancel your subscription at any time.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">What&apos;s the platform fee?</h3>
            <p className="text-muted-foreground text-sm">
              The platform fee is a small percentage taken from payments you receive from patients. Higher tier plans have lower fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
