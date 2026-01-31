import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPlatformAnalytics } from "@/server/actions/analytics";
import {
  Users,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  CheckCircle,
  MapPin,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ExportAnalyticsButton } from "@/components/analytics/export-button";

export const metadata: Metadata = {
  title: "Platform Analytics | Admin",
  description: "View platform-wide analytics and metrics",
};

function StatCard({
  title,
  value,
  description,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  change?: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {change !== undefined && (
            <span
              className={`flex items-center mr-1 ${
                trend === "up"
                  ? "text-green-600"
                  : trend === "down"
                    ? "text-red-600"
                    : ""
              }`}
            >
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : trend === "down" ? (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              ) : null}
              {change > 0 ? "+" : ""}
              {change}%
            </span>
          )}
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

async function AnalyticsContent() {
  const data = await getPlatformAnalytics(30);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={data.overview.totalUsers.toLocaleString()}
          description={`+${data.currentPeriod.newUsers} this month`}
          change={data.currentPeriod.changes.users}
          trend={data.currentPeriod.changes.users > 0 ? "up" : data.currentPeriod.changes.users < 0 ? "down" : "neutral"}
          icon={Users}
        />
        <StatCard
          title="Active Daycares"
          value={data.overview.totalDaycares.toLocaleString()}
          description={`+${data.currentPeriod.newDaycares} this month`}
          change={data.currentPeriod.changes.daycares}
          trend={data.currentPeriod.changes.daycares > 0 ? "up" : data.currentPeriod.changes.daycares < 0 ? "down" : "neutral"}
          icon={Building2}
        />
        <StatCard
          title="Total Bookings"
          value={data.overview.totalBookings.toLocaleString()}
          description={`+${data.currentPeriod.newBookings} this month`}
          change={data.currentPeriod.changes.bookings}
          trend={data.currentPeriod.changes.bookings > 0 ? "up" : data.currentPeriod.changes.bookings < 0 ? "down" : "neutral"}
          icon={Calendar}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${data.currentPeriod.revenue.toLocaleString()}`}
          description="vs last month"
          change={data.currentPeriod.changes.revenue}
          trend={data.currentPeriod.changes.revenue > 0 ? "up" : data.currentPeriod.changes.revenue < 0 ? "down" : "neutral"}
          icon={DollarSign}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Paid daycare plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentPeriod.enrollments}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.pendingVerifications}</div>
            <Link href="/admin/verifications" className="text-xs text-primary hover:underline">
              Review now →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Booking Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Funnel</CardTitle>
          <CardDescription>Conversion rates through the booking journey (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Page Views</span>
              </div>
              <div className="text-3xl font-bold">{data.funnel.pageViews.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Daycare profile visits</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Contact Clicks</span>
              </div>
              <div className="text-3xl font-bold">{data.funnel.contactClicks.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                {data.funnel.conversionRates.viewToContact}% of views
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Booking Started</span>
              </div>
              <div className="text-3xl font-bold">{data.funnel.bookingStarts.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                {data.funnel.conversionRates.contactToBooking}% of contacts
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Completed</span>
              </div>
              <div className="text-3xl font-bold">{data.funnel.bookingCompletes.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                {data.funnel.conversionRates.overall}% overall
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Daycares */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Daycares</CardTitle>
            <CardDescription>By booking volume this month</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topDaycares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-4">
                {data.topDaycares.map((daycare, i) => (
                  <div key={daycare.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5">
                        #{i + 1}
                      </span>
                      <div>
                        <Link
                          href={`/daycare/${daycare.slug}`}
                          className="font-medium hover:underline"
                        >
                          {daycare.name}
                        </Link>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {daycare.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{daycare.bookings} bookings</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distributions */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Users, subscriptions, and locations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Users by Role */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users by Role
              </h4>
              <div className="space-y-2">
                {data.distributions.usersByRole.map((r) => (
                  <div key={r.role} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {r.role.toLowerCase().replace("_", " ")}
                    </span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscriptions by Plan */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscriptions by Plan
              </h4>
              <div className="space-y-2">
                {data.distributions.subscriptionsByPlan.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active subscriptions</p>
                ) : (
                  data.distributions.subscriptionsByPlan.map((s) => (
                    <div key={s.plan} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {s.plan.toLowerCase()}
                      </span>
                      <span className="font-medium">{s.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top States */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Top States
              </h4>
              <div className="space-y-2">
                {data.distributions.daycaresByState.slice(0, 5).map((s) => (
                  <div key={s.state} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.state}</span>
                    <span className="font-medium">{s.count} daycares</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Overview of platform performance and metrics
          </p>
        </div>
        <ExportAnalyticsButton type="platform" />
      </div>

      <Suspense fallback={<div className="text-center py-8">Loading analytics...</div>}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
