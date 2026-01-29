"use client";

import { useState, useTransition } from "react";
import { SubscriptionPlan } from "@prisma/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { PricingPlan } from "@/config/pricing";
import { createCheckoutSession } from "@/server/actions/stripe";
import { toast } from "sonner";

interface PlanCardProps {
  plan: SubscriptionPlan;
  data: PricingPlan;
  isCurrentPlan: boolean;
}

export function PlanCard({ plan, data, isCurrentPlan }: PlanCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleUpgrade = () => {
    startTransition(async () => {
      const result = await createCheckoutSession(plan as "STARTER" | "PROFESSIONAL" | "ENTERPRISE");
      if (result && "error" in result) {
        toast.error(result.error);
      }
      // If successful, user will be redirected to Stripe Checkout
    });
  };

  return (
    <Card className={data.popular ? "border-primary shadow-md" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{data.name}</CardTitle>
          {data.popular && (
            <Badge variant="default">Popular</Badge>
          )}
        </div>
        <CardDescription>{data.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="text-3xl font-bold">${data.price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <ul className="space-y-2">
          {data.features.slice(0, 5).map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
          {data.features.length > 5 && (
            <li className="text-sm text-muted-foreground">
              +{data.features.length - 5} more features
            </li>
          )}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={data.popular ? "default" : "outline"}
          disabled={isCurrentPlan || isPending || plan === "FREE"}
          onClick={handleUpgrade}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : (
            "Upgrade"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
