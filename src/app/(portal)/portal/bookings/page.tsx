import { Suspense } from "react";
import { Calendar, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPortalBookings,
  getPortalBookingStats,
  type PortalBookingFilter,
} from "@/server/actions/portal-bookings";
import { PortalBookingCard } from "@/components/portal/portal-booking-card";
import type { PortalBooking } from "@/types";

export const metadata = {
  title: "Bookings | Provider Portal",
  description: "Manage tour and enrollment bookings",
};

async function BookingStats() {
  const stats = await getPortalBookingStats();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">Awaiting your response</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Confirmed</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.confirmed}</div>
          <p className="text-xs text-muted-foreground">Scheduled visits</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.todayBookings}</div>
          <p className="text-xs text-muted-foreground">Visits scheduled today</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function BookingList({ filter }: { filter: PortalBookingFilter }) {
  const bookings = await getPortalBookings(filter);

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No bookings found</h3>
        <p className="text-muted-foreground">
          {filter === "pending"
            ? "You don't have any pending booking requests."
            : filter === "confirmed"
              ? "You don't have any upcoming confirmed bookings."
              : "No past bookings to show."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking: PortalBooking) => (
        <PortalBookingCard
          key={booking.id}
          booking={{
            ...booking,
            type: booking.type as "TOUR" | "ENROLLMENT",
          }}
          showActions={filter !== "past"}
        />
      ))}
    </div>
  );
}

function BookingListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PortalBookingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground">
          Manage tour requests and enrollment applications
        </p>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <BookingStats />
      </Suspense>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Suspense fallback={<BookingListSkeleton />}>
            <BookingList filter="pending" />
          </Suspense>
        </TabsContent>

        <TabsContent value="confirmed">
          <Suspense fallback={<BookingListSkeleton />}>
            <BookingList filter="confirmed" />
          </Suspense>
        </TabsContent>

        <TabsContent value="past">
          <Suspense fallback={<BookingListSkeleton />}>
            <BookingList filter="past" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
