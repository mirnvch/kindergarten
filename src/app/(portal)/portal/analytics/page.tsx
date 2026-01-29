import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Analytics | KinderCare Portal",
  description: "View your daycare analytics",
};

async function getAnalytics(userId: string) {
  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId, role: { in: ["owner", "manager"] } },
    include: { daycare: true },
  });

  if (!daycareStaff) {
    return null;
  }

  const daycareId = daycareStaff.daycare.id;
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

  return {
    daycare: daycareStaff.daycare,
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

  const { daycare, stats, recentBookings } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Performance overview for {daycare.name}
        </p>
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
    </div>
  );
}
