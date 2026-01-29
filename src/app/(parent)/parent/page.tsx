import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Baby,
  Calendar,
  Clock,
  MessageSquare,
  Search,
  Heart,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard | KinderCare",
  description: "Manage your children and bookings",
};

async function getParentDashboardData(userId: string) {
  const [
    childrenCount,
    upcomingTours,
    pendingEnrollments,
    unreadMessages,
    upcomingBookings,
  ] = await Promise.all([
    db.child.count({
      where: { parentId: userId },
    }),
    db.booking.count({
      where: {
        parentId: userId,
        type: "TOUR",
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: new Date() },
      },
    }),
    db.enrollment.count({
      where: {
        child: { parentId: userId },
        status: "pending",
      },
    }),
    db.message.count({
      where: {
        thread: { parentId: userId },
        status: "SENT",
        senderId: { not: userId },
      },
    }),
    db.booking.findMany({
      where: {
        parentId: userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: new Date() },
      },
      include: {
        daycare: { select: { name: true, slug: true } },
        child: { select: { firstName: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  return {
    stats: {
      childrenCount,
      upcomingTours,
      pendingEnrollments,
      unreadMessages,
    },
    upcomingBookings,
  };
}

export default async function ParentDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const data = await getParentDashboardData(session.user.id);
  const { stats, upcomingBookings } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.firstName}! Here&apos;s your overview.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Children</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.childrenCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.childrenCount === 1 ? "Child profile" : "Child profiles"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingTours}</div>
            <p className="text-xs text-muted-foreground">Scheduled visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Enrollments
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingEnrollments}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">From daycares</p>
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
                <Link href="/parent/bookings">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No upcoming bookings
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/search">Find daycares to schedule a tour</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <Link
                        href={`/daycare/${booking.daycare.slug}`}
                        className="font-medium hover:underline"
                      >
                        {booking.daycare.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {booking.type === "TOUR" ? "Tour" : "Enrollment"}
                        {booking.child && ` for ${booking.child.firstName}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {booking.scheduledAt
                          ? formatDate(booking.scheduledAt)
                          : "TBD"}
                      </p>
                      <Badge
                        variant={
                          booking.status === "CONFIRMED" ? "default" : "secondary"
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
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" />
                Find Daycares
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/parent/children/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Child Profile
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/parent/favorites">
                <Heart className="mr-2 h-4 w-4" />
                View Favorites
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/parent/messages">
                <MessageSquare className="mr-2 h-4 w-4" />
                View Messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
