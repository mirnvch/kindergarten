"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  Baby,
  Check,
  X,
  MoreVertical,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  confirmBooking,
  declineBooking,
  markBookingCompleted,
  markBookingNoShow,
} from "@/server/actions/portal-bookings";
import { formatDate, calculateAge } from "@/lib/utils";

interface PortalBookingCardProps {
  booking: {
    id: string;
    type: "TOUR" | "ENROLLMENT";
    status: string;
    scheduledAt: Date | null;
    duration: number | null;
    notes: string | null;
    createdAt: Date;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
    child: {
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth: Date;
    } | null;
  };
  showActions?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  COMPLETED: { label: "Completed", variant: "outline" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
};

export function PortalBookingCard({
  booking,
  showActions = true,
}: PortalBookingCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const isTour = booking.type === "TOUR";
  const status = statusConfig[booking.status] || statusConfig.PENDING;

  const childAge = booking.child
    ? calculateAge(new Date(booking.child.dateOfBirth))
    : null;

  const childAgeText = childAge
    ? childAge.years > 0
      ? `${childAge.years} yr${childAge.years > 1 ? "s" : ""}${childAge.months > 0 ? ` ${childAge.months} mo` : ""}`
      : `${childAge.months} mo`
    : null;

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await confirmBooking(booking.id);
        toast.success("Booking confirmed");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to confirm booking"
        );
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      try {
        await declineBooking(booking.id, declineReason);
        toast.success("Booking declined");
        setShowDeclineDialog(false);
        setDeclineReason("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to decline booking"
        );
      }
    });
  };

  const handleComplete = () => {
    startTransition(async () => {
      try {
        await markBookingCompleted(booking.id);
        toast.success("Booking marked as completed");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update booking"
        );
      }
    });
  };

  const handleNoShow = () => {
    startTransition(async () => {
      try {
        await markBookingNoShow(booking.id);
        toast.success("Booking marked as no-show");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update booking"
        );
      }
    });
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Badge variant="outline">
                  {isTour ? "Tour" : "Enrollment"}
                </Badge>
              </div>

              {/* Parent info */}
              <div>
                <p className="font-semibold">
                  {booking.parent.firstName} {booking.parent.lastName}
                </p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <a
                    href={`mailto:${booking.parent.email}`}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Mail className="h-4 w-4" />
                    {booking.parent.email}
                  </a>
                  {booking.parent.phone && (
                    <a
                      href={`tel:${booking.parent.phone}`}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                      {booking.parent.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Child info */}
              {booking.child && (
                <div className="flex items-center gap-2 text-sm">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {booking.child.firstName} {booking.child.lastName}
                    {childAgeText && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({childAgeText})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Date/Time */}
              {booking.scheduledAt && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(booking.scheduledAt, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  {isTour && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {new Date(booking.scheduledAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {booking.duration && (
                        <span className="text-muted-foreground">
                          ({booking.duration} min)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {booking.notes}
                  </p>
                </div>
              )}

              {/* Submitted time */}
              <p className="text-xs text-muted-foreground">
                Submitted {formatDate(booking.createdAt)}
              </p>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 sm:flex-col">
                {booking.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleConfirm}
                      disabled={isPending}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeclineDialog(true)}
                      disabled={isPending}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Decline
                    </Button>
                  </>
                )}

                {booking.status === "CONFIRMED" && isTour && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" disabled={isPending}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleComplete}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleNoShow}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Mark No-Show
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowDeclineDialog(true)}
                        className="text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel Booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this{" "}
              {isTour ? "tour request" : "enrollment application"}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="declineReason">Reason (optional)</Label>
            <Textarea
              id="declineReason"
              placeholder="Let them know why..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeclineDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={isPending}
            >
              {isPending ? "Declining..." : "Decline Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
