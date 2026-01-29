"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Clock, X } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cancelBooking } from "@/server/actions/bookings";
import { formatDate, formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { BookingStatus, BookingType } from "@prisma/client";

interface BookingCardProps {
  booking: {
    id: string;
    type: BookingType;
    status: BookingStatus;
    scheduledAt: Date | null;
    duration: number | null;
    notes: string | null;
    daycare: {
      id: string;
      name: string;
      slug: string;
      address: string;
      city: string;
      state: string;
    };
    child: {
      id: string;
      firstName: string;
      lastName: string;
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
  const [isPending, startTransition] = useTransition();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const canCancel =
    showCancelButton &&
    (booking.status === "PENDING" || booking.status === "CONFIRMED");

  function handleCancel() {
    startTransition(async () => {
      try {
        await cancelBooking(booking.id, cancelReason);
        toast.success("Booking cancelled");
        setShowCancelDialog(false);
        setCancelReason("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to cancel booking"
        );
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/daycare/${booking.daycare.slug}`}
                  className="font-semibold hover:underline"
                >
                  {booking.daycare.name}
                </Link>
                <Badge variant={statusColors[booking.status]}>
                  {statusLabels[booking.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {booking.type === "TOUR" ? "Facility Tour" : "Enrollment Application"}
                {booking.child && ` for ${booking.child.firstName}`}
              </p>
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
                  {booking.duration && ` (${booking.duration} min)`}
                </div>
              )}
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {booking.daycare.city}, {booking.daycare.state}
              </div>
            </div>

            {booking.notes && (
              <p className="text-sm">{booking.notes}</p>
            )}
          </div>
        </div>
      </CardContent>

      {canCancel && (
        <CardFooter className="border-t pt-4">
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel Booking
            </Button>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Booking</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel your{" "}
                  {booking.type === "TOUR" ? "tour" : "enrollment"} at{" "}
                  {booking.daycare.name}?
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Let the daycare know why you're cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-2"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                >
                  Keep Booking
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  {isPending ? "Cancelling..." : "Cancel Booking"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}
