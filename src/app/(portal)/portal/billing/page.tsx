import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRICING_PLANS } from "@/config/pricing";
import { SubscriptionPlan } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Calendar, TrendingUp } from "lucide-react";
import { PlanCard } from "@/components/billing/plan-card";
import { BillingHistory } from "@/components/billing/billing-history";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";

export const metadata: Metadata = {
  title: "Billing | DocConnect Portal",
  description: "Manage your subscription and billing",
};

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get daycare with subscription
  const providerStaff = await db.providerStaff.findFirst({
    where: {
      userId: session.user.id,
      role: "owner",
    },
    include: {
      daycare: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!providerStaff) {
    redirect("/portal");
  }

  const daycare = providerStaff.daycare;
  const subscription = daycare.subscription;
  const currentPlan = subscription?.plan || "FREE";
  const planData = PRICING_PLANS[currentPlan];

  // Get recent payments
  const payments = await db.payment.findMany({
    where: {
      providerId: daycare.id,
      type: "subscription",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const isActive = subscription?.status === "ACTIVE";
  const isPastDue = subscription?.status === "PAST_DUE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view billing history
        </p>
      </div>

      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Your subscription and usage overview
              </CardDescription>
            </div>
            {subscription?.stripeCustomerId && (
              <ManageSubscriptionButton />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">{planData.name}</h3>
                {isActive && (
                  <Badge variant="default">Active</Badge>
                )}
                {isPastDue && (
                  <Badge variant="destructive">Past Due</Badge>
                )}
                {!subscription && (
                  <Badge variant="secondary">Free</Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {currentPlan === "FREE" ? "No charge" : `$${planData.price}/month`}
              </p>
            </div>
          </div>

          {subscription?.currentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4" />
              <span>
                {subscription.canceledAt
                  ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Next billing date: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
              </span>
            </div>
          )}

          {/* Plan Features */}
          <div className="grid gap-2">
            <h4 className="text-sm font-medium">Included features:</h4>
            <ul className="grid gap-1">
              {planData.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Photos</p>
              <p className="text-lg font-semibold">
                {planData.limits.photos === -1 ? "Unlimited" : `${planData.limits.photos}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Programs</p>
              <p className="text-lg font-semibold">
                {planData.limits.programs === -1 ? "Unlimited" : `${planData.limits.programs}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-lg font-semibold">
                {planData.limits.teamMembers === -1 ? "Unlimited" : `${planData.limits.teamMembers}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      {currentPlan !== "ENTERPRISE" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Upgrade Your Plan</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(PRICING_PLANS) as [SubscriptionPlan, typeof planData][])
              .filter(([plan]) => {
                const planOrder = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"];
                return planOrder.indexOf(plan) > planOrder.indexOf(currentPlan);
              })
              .map(([plan, data]) => (
                <PlanCard
                  key={plan}
                  plan={plan}
                  data={data}
                  isCurrentPlan={plan === currentPlan}
                />
              ))}
          </div>
        </div>
      )}

      {/* Billing History */}
      <BillingHistory payments={payments} />
    </div>
  );
}
