import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Eye,
  Calendar,
  Users,
  TrendingUp,
  Star,
  MessageSquare,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Lock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Analytics | KinderCare Portal",
  description: "View your daycare analytics",
};

async function getAnalytics(userId: string) {
  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId, role: { in: ["owner", "manager"] } },
    include: {
      daycare: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!daycareStaff) {
    return null;
  }

  const daycareId = daycareStaff.daycare.id;
  const subscription = daycareStaff.daycare.subscription;
  const isPremium = subscription?.status === "ACTIVE" && subscription.plan !== "FREE";
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get all stats in parallel
  const [
    thisMonthBookings,
    lastMonthBookings,
    thisMonthEnrollments,
    activeEnrollments,
    avgRating,
    reviewCount,
    thisMonthMessages,
    lastMonthMessages,
    thisMonthRevenue,
    lastMonthRevenue,
  ] = await Promise.all([
    // This month bookings
    db.booking.count({
      where: {
        daycareId,
        createdAt: { gte: thisMonthStart },
      },
    }),
    // Last month bookings
    db.booking.count({
      where: {
        daycareId,
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),
    // This month new enrollments
    db.enrollment.count({
      where: {
        daycareId,
        createdAt: { gte: thisMonthStart },
      },
    }),
    // Active enrollments
    db.enrollment.count({
      where: {
        daycareId,
        status: "ACTIVE",
      },
    }),
    // Average rating
    db.review.aggregate({
      where: { daycareId, isApproved: true },
      _avg: { rating: true },
    }),
    // Review count
    db.review.count({
      where: { daycareId, isApproved: true },
    }),
    // This month messages
    db.message.count({
      where: {
        thread: { daycareId },
        createdAt: { gte: thisMonthStart },
      },
    }),
    // Last month messages
    db.message.count({
      where: {
        thread: { daycareId },
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),
    // This month revenue
    db.payment.aggregate({
      where: {
        daycareId,
        status: "SUCCEEDED",
        createdAt: { gte: thisMonthStart },
      },
      _sum: { amount: true },
    }),
    // Last month revenue
    db.payment.aggregate({
      where: {
        daycareId,
        status: "SUCCEEDED",
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  // Calculate booking conversion (confirmed / total)
  const confirmedBookings = await db.booking.count({
    where: {
      daycareId,
      status: "CONFIRMED",
      createdAt: { gte: thisMonthStart },
    },
  });
  const conversionRate = thisMonthBookings > 0
    ? Math.round((confirmedBookings / thisMonthBookings) * 100)
    : 0;

  // Recent bookings for activity feed
  const recentBookings = await db.booking.findMany({
    where: { daycareId },
    include: {
      parent: { select: { firstName: true, lastName: true } },
      child: { select: { firstName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Premium analytics: weekly trends for the last 4 weeks
  let weeklyTrends = null;
  let topSources = null;
  let peakHours = null;

  if (isPremium) {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weeks.push({ start: weekStart, end: weekEnd });
    }

    weeklyTrends = await Promise.all(
      weeks.map(async ({ start, end }) => {
        const [bookings, messages, revenue] = await Promise.all([
          db.booking.count({
            where: { daycareId, createdAt: { gte: start, lt: end } },
          }),
          db.message.count({
            where: { thread: { daycareId }, createdAt: { gte: start, lt: end } },
          }),
          db.payment.aggregate({
            where: { daycareId, status: "SUCCEEDED", createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);
        return {
          week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          bookings,
          messages,
          revenue: Number(revenue._sum.amount || 0),
        };
      })
    );

    // Peak hours analysis (mock for now - would need view tracking)
    peakHours = [
      { hour: "9 AM", views: 45 },
      { hour: "10 AM", views: 62 },
      { hour: "11 AM", views: 58 },
      { hour: "12 PM", views: 41 },
      { hour: "1 PM", views: 38 },
      { hour: "2 PM", views: 52 },
      { hour: "3 PM", views: 67 },
      { hour: "4 PM", views: 71 },
      { hour: "5 PM", views: 55 },
    ];

    // Booking sources (mock - would need tracking)
    topSources = [
      { source: "Search", percentage: 45 },
      { source: "Direct", percentage: 25 },
      { source: "Referral", percentage: 18 },
      { source: "Social", percentage: 12 },
    ];
  }

  return {
    daycare: daycareStaff.daycare,
    isPremium,
    subscriptionPlan: subscription?.plan || "FREE",
    stats: {
      bookings: {
        current: thisMonthBookings,
        previous: lastMonthBookings,
        change: lastMonthBookings > 0
          ? Math.round(((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100)
          : 0,
      },
      enrollments: {
        new: thisMonthEnrollments,
        active: activeEnrollments,
      },
      rating: {
        average: avgRating._avg.rating || 0,
        count: reviewCount,
      },
      messages: {
        current: thisMonthMessages,
        previous: lastMonthMessages,
        change: lastMonthMessages > 0
          ? Math.round(((thisMonthMessages - lastMonthMessages) / lastMonthMessages) * 100)
          : 0,
      },
      revenue: {
        current: Number(thisMonthRevenue._sum.amount || 0),
        previous: Number(lastMonthRevenue._sum.amount || 0),
        change: Number(lastMonthRevenue._sum.amount || 0) > 0
          ? Math.round(((Number(thisMonthRevenue._sum.amount || 0) - Number(lastMonthRevenue._sum.amount || 0)) / Number(lastMonthRevenue._sum.amount || 0)) * 100)
          : 0,
      },
      conversionRate,
    },
    recentBookings,
    premium: isPremium ? {
      weeklyTrends,
      peakHours,
      topSources,
    } : null,
  };
}

function StatCard({
  title,
  value,
  description,
  change,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  change?: number;
  icon: React.ElementType;
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
                change > 0
                  ? "text-green-600"
                  : change < 0
                    ? "text-red-600"
                    : ""
              }`}
            >
              {change > 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : change < 0 ? (
                <ArrowDown className="h-3 w-3" />
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

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const data = await getAnalytics(session.user.id);

  if (!data) {
    redirect("/portal");
  }

  const { daycare, stats, recentBookings, isPremium, subscriptionPlan, premium } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Performance overview for {daycare.name}
          </p>
        </div>
        {isPremium && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {subscriptionPlan} Plan
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tour Requests"
          value={stats.bookings.current}
          description="vs last month"
          change={stats.bookings.change}
          icon={Calendar}
        />
        <StatCard
          title="Active Enrollments"
          value={stats.enrollments.active}
          description={`${stats.enrollments.new} new this month`}
          icon={Users}
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          description="bookings confirmed"
          icon={TrendingUp}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue.current.toLocaleString()}`}
          description="vs last month"
          change={stats.revenue.change}
          icon={DollarSign}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Average Rating"
          value={stats.rating.average.toFixed(1)}
          description={`from ${stats.rating.count} reviews`}
          icon={Star}
        />
        <StatCard
          title="Messages"
          value={stats.messages.current}
          description="vs last month"
          change={stats.messages.change}
          icon={MessageSquare}
        />
        <StatCard
          title="Profile Views"
          value="—"
          description="tracking coming soon"
          icon={Eye}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Booking Activity</CardTitle>
          <CardDescription>Latest tour and enrollment requests</CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent bookings
            </p>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {booking.parent.firstName} {booking.parent.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.type === "TOUR" ? "Tour request" : "Enrollment"}{" "}
                      {booking.child && `for ${booking.child.firstName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        booking.status === "CONFIRMED"
                          ? "text-green-600"
                          : booking.status === "PENDING"
                            ? "text-yellow-600"
                            : booking.status === "CANCELLED"
                              ? "text-red-600"
                              : ""
                      }`}
                    >
                      {booking.status.toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Analytics Section */}
      {isPremium && premium ? (
        <>
          {/* Weekly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Trends</CardTitle>
              <CardDescription>Performance over the last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {premium.weeklyTrends?.map((week, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 items-center py-2 border-b last:border-0">
                    <div className="font-medium">{week.week}</div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{week.bookings}</p>
                      <p className="text-xs text-muted-foreground">bookings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{week.messages}</p>
                      <p className="text-xs text-muted-foreground">messages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">${week.revenue}</p>
                      <p className="text-xs text-muted-foreground">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where your visitors come from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {premium.topSources?.map((source, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{source.source}</span>
                      <span className="font-medium">{source.percentage}%</span>
                    </div>
                    <Progress value={source.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>When parents browse your profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {premium.peakHours?.map((hour, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{hour.hour}</span>
                      <span className="font-medium">{hour.views} views</span>
                    </div>
                    <Progress value={(hour.views / 80) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Upgrade Prompt for Free Users */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Unlock Advanced Analytics</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Upgrade to a paid plan to access weekly trends, traffic sources,
              peak hours, and more detailed insights.
            </p>
            <Button asChild>
              <Link href="/portal/billing">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade Now
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
