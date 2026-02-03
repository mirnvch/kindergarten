import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Eye,
  Calendar,
  TrendingUp,
  Star,
  MessageSquare,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Lock,
  Sparkles,
  Video,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Analytics | DocConnect Portal",
  description: "View your practice analytics",
};

async function getAnalytics(userId: string) {
  const providerStaff = await db.providerStaff.findFirst({
    where: { userId, role: { in: ["owner", "manager"] } },
    include: {
      provider: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!providerStaff) {
    return null;
  }

  const providerId = providerStaff.provider.id;
  const subscription = providerStaff.provider.subscription;
  const isPremium = subscription?.status === "ACTIVE" && subscription.plan !== "FREE";
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Get all stats in parallel
  const [
    thisMonthAppointments,
    lastMonthAppointments,
    thisMonthTelemedicine,
    completedAppointments,
    avgRating,
    reviewCount,
    thisMonthMessages,
    lastMonthMessages,
    thisMonthRevenue,
    lastMonthRevenue,
  ] = await Promise.all([
    // This month appointments
    db.appointment.count({
      where: {
        providerId,
        createdAt: { gte: thisMonthStart },
      },
    }),
    // Last month appointments
    db.appointment.count({
      where: {
        providerId,
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),
    // This month telemedicine
    db.appointment.count({
      where: {
        providerId,
        type: "TELEMEDICINE",
        createdAt: { gte: thisMonthStart },
      },
    }),
    // Completed appointments
    db.appointment.count({
      where: {
        providerId,
        status: "COMPLETED",
      },
    }),
    // Average rating
    db.review.aggregate({
      where: { providerId, isApproved: true },
      _avg: { rating: true },
    }),
    // Review count
    db.review.count({
      where: { providerId, isApproved: true },
    }),
    // This month messages
    db.message.count({
      where: {
        thread: { providerId },
        createdAt: { gte: thisMonthStart },
      },
    }),
    // Last month messages
    db.message.count({
      where: {
        thread: { providerId },
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),
    // This month revenue
    db.payment.aggregate({
      where: {
        providerId,
        status: "SUCCEEDED",
        createdAt: { gte: thisMonthStart },
      },
      _sum: { amount: true },
    }),
    // Last month revenue
    db.payment.aggregate({
      where: {
        providerId,
        status: "SUCCEEDED",
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  // Calculate conversion (confirmed / total)
  const confirmedAppointments = await db.appointment.count({
    where: {
      providerId,
      status: "CONFIRMED",
      createdAt: { gte: thisMonthStart },
    },
  });
  const conversionRate = thisMonthAppointments > 0
    ? Math.round((confirmedAppointments / thisMonthAppointments) * 100)
    : 0;

  // Recent appointments for activity feed
  const recentAppointments = await db.appointment.findMany({
    where: { providerId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      familyMember: { select: { firstName: true } },
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
        const [appointments, messages, revenue] = await Promise.all([
          db.appointment.count({
            where: { providerId, createdAt: { gte: start, lt: end } },
          }),
          db.message.count({
            where: { thread: { providerId }, createdAt: { gte: start, lt: end } },
          }),
          db.payment.aggregate({
            where: { providerId, status: "SUCCEEDED", createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);
        return {
          week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          appointments,
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
    provider: providerStaff.provider,
    isPremium,
    subscriptionPlan: subscription?.plan || "FREE",
    stats: {
      appointments: {
        current: thisMonthAppointments,
        previous: lastMonthAppointments,
        change: lastMonthAppointments > 0
          ? Math.round(((thisMonthAppointments - lastMonthAppointments) / lastMonthAppointments) * 100)
          : 0,
      },
      telemedicine: {
        count: thisMonthTelemedicine,
        completed: completedAppointments,
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
    recentAppointments,
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

  const { provider, stats, recentAppointments, isPremium, subscriptionPlan, premium } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Performance overview for {provider.name}
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
          title="Appointments"
          value={stats.appointments.current}
          description="vs last month"
          change={stats.appointments.change}
          icon={Calendar}
        />
        <StatCard
          title="Telemedicine"
          value={stats.telemedicine.count}
          description={`${stats.telemedicine.completed} completed`}
          icon={Video}
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          description="appointments confirmed"
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
          <CardTitle>Recent Appointment Activity</CardTitle>
          <CardDescription>Latest appointment requests</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent appointments
            </p>
          ) : (
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.type === "TELEMEDICINE" ? "Telemedicine" : "In-Person"}{" "}
                      {appointment.familyMember && `for ${appointment.familyMember.firstName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        appointment.status === "CONFIRMED"
                          ? "text-green-600"
                          : appointment.status === "PENDING"
                            ? "text-yellow-600"
                            : appointment.status === "CANCELLED"
                              ? "text-red-600"
                              : ""
                      }`}
                    >
                      {appointment.status.toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(appointment.createdAt).toLocaleDateString()}
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
                      <p className="text-lg font-semibold">{week.appointments}</p>
                      <p className="text-xs text-muted-foreground">appointments</p>
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
                <CardDescription>When patients browse your profile</CardDescription>
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
