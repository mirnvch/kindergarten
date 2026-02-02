"use client";

import Link from "next/link";
import { Calendar, MapPin, Clock, X, CalendarClock, Video } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CancelDialog } from "@/components/booking/cancel-dialog";
import { RescheduleDialog } from "@/components/booking/reschedule-dialog";
import { formatDate, formatTime } from "@/lib/utils";
import { BookingStatus, AppointmentType } from "@prisma/client";

// Support both old daycare/child and new provider/familyMember terminology
interface BookingCardProps {
  booking: {
    id: string;
    type: AppointmentType;
    status: BookingStatus;
    scheduledAt: Date | null;
    duration: number | null;
    notes: string | null;
    reasonForVisit?: string | null;
    // New provider terminology
    provider?: {
      id: string;
      name: string;
      slug: string;
      address: string;
      city: string;
      state: string;
      specialty?: string | null;
    };
    familyMember?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    // Legacy daycare terminology (optional)
    daycare?: {
      id: string;
      name: string;
      slug: string;
      address: string;
      city: string;
      state: string;
    };
    child?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    service?: {
      id: string;
      name: string;
      duration: number;
    } | null;
  };
  showCancelButton?: boolean;
}

const statusColors: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
  NO_SHOW: "destructive",
};

const statusLabels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

export function BookingCard({ booking, showCancelButton = true }: BookingCardProps) {
  // Support both old and new property names
  const entity = booking.provider || booking.daycare;
  const person = booking.familyMember || booking.child;
  const isTelemedicine = booking.type === "TELEMEDICINE";

  if (!entity) return null;

  const canCancel =
    showCancelButton &&
    (booking.status === "PENDING" || booking.status === "CONFIRMED");

  const canReschedule =
    booking.status === "PENDING" || booking.status === "CONFIRMED";

  // Determine appointment type label
  const getTypeLabel = () => {
    if (booking.service?.name) return booking.service.name;
    if (isTelemedicine) return "Telemedicine Visit";
    return "In-Person Appointment";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/provider/${entity.slug}`}
                  className="font-semibold hover:underline"
                >
                  {entity.name}
                </Link>
                <Badge variant={statusColors[booking.status]}>
                  {statusLabels[booking.status]}
                </Badge>
                {isTelemedicine && (
                  <Badge variant="secondary" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    Video
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {getTypeLabel()}
                {person && ` for ${person.firstName}`}
              </p>
              {"specialty" in entity && entity.specialty && (
                <p className="text-xs text-muted-foreground">{entity.specialty}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {booking.scheduledAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(booking.scheduledAt)}
                </div>
              )}
              {booking.scheduledAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(
                    new Date(booking.scheduledAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  )}
                  {(booking.duration || booking.service?.duration) &&
                    ` (${booking.duration || booking.service?.duration} min)`}
                </div>
              )}
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {entity.city}, {entity.state}
              </div>
            </div>

            {booking.reasonForVisit && (
              <p className="text-sm">
                <span className="font-medium">Reason: </span>
                {booking.reasonForVisit}
              </p>
            )}

            {booking.notes && (
              <p className="text-sm text-muted-foreground">{booking.notes}</p>
            )}
          </div>
        </div>
      </CardContent>

      {(canCancel || canReschedule) && (
        <CardFooter className="border-t pt-4 gap-2">
          {canReschedule && booking.scheduledAt && (
            <RescheduleDialog
              bookingId={booking.id}
              daycareId={entity.id}
              daycareName={entity.name}
              currentDate={new Date(booking.scheduledAt)}
            >
              <Button variant="outline" size="sm">
                <CalendarClock className="mr-2 h-4 w-4" />
                Reschedule
              </Button>
            </RescheduleDialog>
          )}
          {canCancel && (
            <CancelDialog
              bookingId={booking.id}
              scheduledAt={booking.scheduledAt ? new Date(booking.scheduledAt) : null}
            >
              <Button variant="outline" size="sm">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </CancelDialog>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
