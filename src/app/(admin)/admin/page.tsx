import { Suspense } from "react";
import {
  Users,
  Building2,
  Calendar,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

async function getStats() {
  const [
    totalUsers,
    totalProviders,
    pendingProviders,
    totalAppointments,
    confirmedAppointments,
    recentUsers,
    recentProviders,
  ] = await Promise.all([
    db.user.count(),
    db.provider.count(),
    db.provider.count({ where: { status: "PENDING" } }),
    db.appointment.count(),
    db.appointment.count({ where: { status: "CONFIRMED" } }),
    db.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    db.provider.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    totalUsers,
    totalProviders,
    pendingProviders,
    totalAppointments,
    confirmedAppointments,
    recentUsers,
    recentProviders,
  };
}

async function getRecentActivity() {
  const [recentAppointments, recentReviews] = await Promise.all([
    db.appointment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        provider: { select: { name: true } },
      },
    }),
    db.review.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true } },
        provider: { select: { name: true } },
      },
    }),
  ]);

  return { recentAppointments, recentReviews };
}

function StatsCards({ stats }: { stats: Awaited<ReturnType<typeof getStats>> }) {
  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      change: `+${stats.recentUsers} this week`,
      changeType: "positive",
    },
    {
      title: "Total Providers",
      value: stats.totalProviders,
      icon: Building2,
      change: `+${stats.recentProviders} this week`,
      changeType: "positive",
    },
    {
      title: "Pending Approval",
      value: stats.pendingProviders,
      icon: Clock,
      change: "Awaiting review",
      changeType: "neutral",
    },
    {
      title: "Total Appointments",
      value: stats.totalAppointments,
      icon: Calendar,
      change: `${stats.confirmedAppointments} confirmed`,
      changeType: "positive",
    },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {card.changeType === "positive" && (
                <TrendingUp className="h-3 w-3 text-green-500" />
              )}
              {card.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecentActivity({
  activity,
}: {
  activity: Awaited<ReturnType<typeof getRecentActivity>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity.recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent appointments</p>
            ) : (
              activity.recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.provider.name}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      appointment.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : appointment.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {appointment.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity.recentReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent reviews</p>
            ) : (
              activity.recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {review.user.firstName} {review.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {review.provider.name} - {review.rating}/5
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and recent activity
        </p>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <StatsCards stats={stats} />
      </Suspense>

      <Suspense fallback={<div>Loading activity...</div>}>
        <RecentActivity activity={activity} />
      </Suspense>
    </div>
  );
}
