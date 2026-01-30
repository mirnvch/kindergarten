"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cancelBooking } from "@/server/actions/bookings";

interface CancelDialogProps {
  bookingId: string;
  scheduledAt: Date | null;
  children: React.ReactNode;
}

export function CancelDialog({ bookingId, scheduledAt, children }: CancelDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  // Check if cancellation is allowed (24 hours before)
  const [canCancel, setCanCancel] = useState(true);

  // Recalculate when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && scheduledAt) {
      const hoursUntilBooking = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
      setCanCancel(hoursUntilBooking >= 24);
    }
    setOpen(newOpen);
  };

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelBooking(bookingId, reason || undefined);
        toast.success("Booking cancelled successfully");
        setOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to cancel booking"
        );
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Booking
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <span>Are you sure you want to cancel this booking?</span>

            {/* Cancellation Policy */}
            <div className="rounded-lg bg-muted p-4 text-sm">
              <h4 className="font-semibold text-foreground mb-2">
                Cancellation Policy
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Free cancellation up to 24 hours before scheduled time</li>
                <li>• Late cancellations may affect future booking priority</li>
                <li>• No-shows may be flagged on your account</li>
              </ul>
            </div>

            {!canCancel && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm">
                <p className="text-destructive font-medium">
                  Warning: This booking is less than 24 hours away.
                </p>
                <p className="text-muted-foreground mt-1">
                  Cancelling now may affect your account standing.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Reason for cancellation (optional)</Label>
          <Textarea
            id="reason"
            placeholder="Let us know why you're cancelling..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Booking"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
