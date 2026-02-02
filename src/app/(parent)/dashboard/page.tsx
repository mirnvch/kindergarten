import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Users,
  Calendar,
  Clock,
  MessageSquare,
  Search,
  Heart,
  Plus,
  ArrowRight,
  ClipboardList,
  Video,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { DashboardAppointment } from "@/types";
import { WaitlistEntriesList } from "@/components/waitlist/waitlist-entries-list";

export const metadata: Metadata = {
  title: "Dashboard | DocConnect",
  description: "Manage your appointments and family members",
};

async function getPatientDashboardData(userId: string, userEmail: string) {
  const [
    familyMembersCount,
    upcomingAppointments,
    unreadMessages,
    upcomingAppointmentsList,
    waitlistEntries,
  ] = await Promise.all([
    db.familyMember.count({
      where: { patientId: userId },
    }),
    db.appointment.count({
      where: {
        patientId: userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: new Date() },
      },
    }),
    db.message.count({
      where: {
        thread: { patientId: userId },
        status: "SENT",
        senderId: { not: userId },
      },
    }),
    db.appointment.findMany({
      where: {
        patientId: userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: new Date() },
      },
      include: {
        provider: { select: { name: true, slug: true, specialty: true } },
        familyMember: { select: { firstName: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    db.waitlistEntry.findMany({
      where: {
        patientEmail: userEmail,
        notifiedAt: null,
      },
      include: {
        provider: {
          select: { id: true, name: true, slug: true, city: true, state: true, specialty: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    stats: {
      familyMembersCount,
      upcomingAppointments,
      unreadMessages,
      waitlistCount: waitlistEntries.length,
    },
    upcomingAppointmentsList,
    waitlistEntries,
  };
}

export default async function PatientDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const data = await getPatientDashboardData(session.user.id, session.user.email || "");
  const { stats, upcomingAppointmentsList, waitlistEntries } = data;

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
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.familyMembersCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.familyMembersCount === 1 ? "Profile" : "Profiles"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">Scheduled visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">From providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waitlistCount}</div>
            <p className="text-xs text-muted-foreground">Providers waiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Appointments</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/bookings">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppointmentsList.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No upcoming appointments
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/search">Find providers to schedule an appointment</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointmentsList.map((appointment: DashboardAppointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <Link
                        href={`/provider/${appointment.provider.slug}`}
                        className="font-medium hover:underline"
                      >
                        {appointment.provider.name}
                      </Link>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {appointment.type === "TELEMEDICINE" ? (
                          <>
                            <Video className="h-3 w-3" />
                            Telemedicine
                          </>
                        ) : (
                          <>
                            <Stethoscope className="h-3 w-3" />
                            In-Person
                          </>
                        )}
                        {appointment.familyMember && ` for ${appointment.familyMember.firstName}`}
                      </p>
                      {appointment.provider.specialty && (
                        <p className="text-xs text-muted-foreground">
                          {appointment.provider.specialty}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {appointment.scheduledAt
                          ? formatDate(appointment.scheduledAt)
                          : "TBD"}
                      </p>
                      <Badge
                        variant={
                          appointment.status === "CONFIRMED" ? "default" : "secondary"
                        }
                      >
                        {appointment.status.toLowerCase()}
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
                Find Providers
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/children/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Family Member
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/favorites">
                <Heart className="mr-2 h-4 w-4" />
                View Favorites
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/messages">
                <MessageSquare className="mr-2 h-4 w-4" />
                View Messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist section */}
      {waitlistEntries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                My Waitlist
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <WaitlistEntriesList entries={waitlistEntries} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
