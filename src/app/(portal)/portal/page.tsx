import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Calendar,
  MessageSquare,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Dashboard | KinderCare Portal",
  description: "Manage your daycare center",
};

async function getDaycareStats(userId: string) {
  // Find the daycare owned by this user
  const daycareStaff = await db.daycareStaff.findFirst({
    where: { userId, role: "owner" },
    include: { daycare: true },
  });

  if (!daycareStaff) {
    return null;
  }

  const daycareId = daycareStaff.daycare.id;

  // Get stats
  const [
    pendingBookings,
    unreadMessages,
    totalEnrollments,
    recentPayments,
  ] = await Promise.all([
    db.booking.count({
      where: { daycareId, status: "PENDING" },
    }),
    db.message.count({
      where: {
        thread: { daycareId },
        status: "SENT",
        senderId: { not: userId },
      },
    }),
    db.enrollment.count({
      where: { daycareId, status: "ACTIVE" },
    }),
    db.payment.aggregate({
      where: {
        daycareId,
        status: "SUCCEEDED",
        createdAt: { gte: new Date(new Date().setDate(1)) }, // This month
      },
      _sum: { amount: true },
    }),
  ]);

  // Get upcoming bookings
  const upcomingBookings = await db.booking.findMany({
    where: {
      daycareId,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: new Date() },
    },
    include: {
      parent: { select: { firstName: true, lastName: true } },
      child: { select: { firstName: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  return {
    daycare: daycareStaff.daycare,
    stats: {
      pendingBookings,
      unreadMessages,
      totalEnrollments,
      monthlyRevenue: recentPayments._sum.amount
        ? Number(recentPayments._sum.amount)
        : 0,
    },
    upcomingBookings,
  };
}

export default async function PortalDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const data = await getDaycareStats(session.user.id);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Daycare Found</h2>
        <p className="text-muted-foreground mb-4">
          You haven&apos;t set up your daycare profile yet.
        </p>
        <Button asChild>
          <Link href="/portal/daycare/setup">Create Daycare Profile</Link>
        </Button>
      </div>
    );
  }

  const { daycare, stats, upcomingBookings } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening at {daycare.name}.
        </p>
      </div>

      {/* Status banner */}
      {daycare.status === "PENDING" && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">
              Your daycare is pending approval
            </span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Our team is reviewing your profile. This usually takes 1-2 business
            days.
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">
              Require your attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unread Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">From parents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Enrollments
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              of {daycare.capacity} capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Bookings</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/portal/bookings">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming bookings
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {booking.parent.firstName} {booking.parent.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.type === "TOUR" ? "Tour" : "Enrollment"} for{" "}
                        {booking.child?.firstName || "child"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {booking.scheduledAt
                          ? new Date(booking.scheduledAt).toLocaleDateString()
                          : "TBD"}
                      </p>
                      <Badge
                        variant={
                          booking.status === "CONFIRMED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {booking.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/portal/daycare">
                <Building2 className="mr-2 h-4 w-4" />
                Edit Daycare Profile
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/portal/bookings">
                <Calendar className="mr-2 h-4 w-4" />
                Manage Bookings
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/portal/messages">
                <MessageSquare className="mr-2 h-4 w-4" />
                View Messages
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/daycare/${daycare.slug}`} target="_blank">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Public Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

