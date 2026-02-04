import { Metadata } from "next";
import Link from "next/link";
import { Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPatientAppointments } from "@/server/actions/appointments";
import { BookingCard } from "@/components/parent/booking-card";
import type { AppointmentWithRelations } from "@/types";

export const metadata: Metadata = {
  title: "My Appointments | DocConnect",
  description: "View and manage your appointments",
};

export default async function AppointmentsPage() {
  const [upcomingResult, pastResult] = await Promise.all([
    getPatientAppointments("upcoming"),
    getPatientAppointments("past"),
  ]);

  const upcomingAppointments = upcomingResult.success ? upcomingResult.data ?? [] : [];
  const pastAppointments = pastResult.success ? pastResult.data ?? [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Appointments</h1>
        <p className="text-muted-foreground">
          View and manage your appointments
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length === 0 ? (
            <EmptyState type="upcoming" />
          ) : (
            upcomingAppointments.map((appointment: AppointmentWithRelations) => (
              <BookingCard key={appointment.id} booking={appointment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastAppointments.length === 0 ? (
            <EmptyState type="past" />
          ) : (
            pastAppointments.map((appointment: AppointmentWithRelations) => (
              <BookingCard
                key={appointment.id}
                booking={appointment}
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
        {type === "upcoming" ? "No upcoming appointments" : "No past appointments"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
        {type === "upcoming"
          ? "You don't have any scheduled appointments. Start by finding a healthcare provider."
          : "You haven't completed any appointments yet."}
      </p>
      {type === "upcoming" && (
        <Button asChild>
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Find a Provider
          </Link>
        </Button>
      )}
    </div>
  );
}
