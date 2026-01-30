"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "./date-picker";
import { TimeSlotGrid } from "./time-slot-grid";
import {
  rescheduleBooking,
  getAvailableSlots,
} from "@/server/actions/bookings";
import { getSlotsForDate, type DayAvailability } from "@/lib/booking-utils";

interface RescheduleDialogProps {
  bookingId: string;
  daycareId: string;
  daycareName: string;
  currentDate: Date;
  children: React.ReactNode;
}

export function RescheduleDialog({
  bookingId,
  daycareId,
  daycareName,
  currentDate,
  children,
}: RescheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const selectedSlots = selectedDate
    ? getSlotsForDate(availability, selectedDate)
    : [];

  const loadAvailability = async () => {
    setIsLoading(true);
    try {
      const slots = await getAvailableSlots(daycareId);
      setAvailability(slots);
    } catch {
      toast.error("Failed to load available slots");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadAvailability();
      setSelectedDate(null);
      setSelectedTime(null);
    }
  };

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedTime(null);
  };

  const handleReschedule = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a new date and time");
      return;
    }

    const newScheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

    startTransition(async () => {
      try {
        await rescheduleBooking({
          bookingId,
          newScheduledAt: newScheduledAt.toISOString(),
        });
        toast.success("Booking rescheduled successfully");
        setOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reschedule"
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Tour</DialogTitle>
          <DialogDescription>
            Select a new date and time for your tour at {daycareName}.
            <br />
            <span className="text-sm">
              Current: {currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Date Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">Select New Date</h3>
              </div>
              <DatePicker
                availability={availability}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
              />
            </div>

            {/* Time Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">Select New Time</h3>
              </div>
              {selectedDate ? (
                <TimeSlotGrid
                  slots={selectedSlots}
                  selectedTime={selectedTime}
                  onSelectTime={setSelectedTime}
                />
              ) : (
                <p className="py-4 text-center text-muted-foreground">
                  Please select a date first
                </p>
              )}
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && (
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2">New Booking Time</h4>
                <p className="text-sm">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rescheduling...
              </>
            ) : (
              "Confirm Reschedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
