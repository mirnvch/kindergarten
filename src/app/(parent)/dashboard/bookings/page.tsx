import { Metadata } from "next";
import Link from "next/link";
import { Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getParentBookings } from "@/server/actions/bookings";
import { BookingCard } from "@/components/parent/booking-card";
import type { BookingWithRelations } from "@/types";

export const metadata: Metadata = {
  title: "My Bookings | KinderCare",
  description: "View and manage your daycare bookings",
};

export default async function BookingsPage() {
  const [upcomingBookings, pastBookings] = await Promise.all([
    getParentBookings("upcoming"),
    getParentBookings("past"),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">
          View and manage your daycare tours and enrollment applications
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <EmptyState type="upcoming" />
          ) : (
            upcomingBookings.map((booking: BookingWithRelations) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <EmptyState type="past" />
          ) : (
            pastBookings.map((booking: BookingWithRelations) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                showCancelButton={false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ type }: { type: "upcoming" | "past" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">
        {type === "upcoming" ? "No upcoming bookings" : "No past bookings"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
        {type === "upcoming"
          ? "You don't have any scheduled tours or pending enrollments. Start by finding daycares near you."
          : "You haven't completed any tours or enrollments yet."}
      </p>
      {type === "upcoming" && (
        <Button asChild>
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Find Daycares
          </Link>
        </Button>
      )}
    </div>
  );
}
