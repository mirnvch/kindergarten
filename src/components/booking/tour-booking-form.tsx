"use client";

import { useState, useTransition } from "react";
import { Loader2, Calendar, Clock, Baby, FileText, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "./date-picker";
import { TimeSlotGrid } from "./time-slot-grid";
import { ChildSelector } from "./child-selector";
import { RecurrenceSelector } from "./recurrence-selector";
import {
  createTourBooking,
  type TourBookingInput,
} from "@/server/actions/bookings";
import {
  getSlotsForDate,
  getRecurrenceLabel,
  generateRecurringDates,
  type DayAvailability,
  type RecurrencePattern,
} from "@/lib/booking-utils";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

interface TourBookingFormProps {
  daycareId: string;
  daycareName: string;
  availability: DayAvailability[];
  children: Child[];
}

export function TourBookingForm({
  daycareId,
  daycareName,
  availability,
  children,
}: TourBookingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrencePattern>("NONE");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);

  const selectedSlots = selectedDate ? getSlotsForDate(availability, selectedDate) : [];

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedTime(null); // Reset time when date changes
  };

  const canSubmit =
    selectedDate && selectedTime && selectedChildId && !isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime || !selectedChildId) {
      toast.error("Please complete all required fields");
      return;
    }

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

    const input: TourBookingInput = {
      daycareId,
      childId: selectedChildId,
      scheduledAt: scheduledAt.toISOString(),
      notes: notes.trim() || undefined,
      recurrence,
      recurrenceEndDate: recurrenceEndDate?.toISOString(),
    };

    startTransition(async () => {
      try {
        await createTourBooking(input);
        // Redirect happens in the server action
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to book tour"
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Select Date */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            1
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Select a Date</h3>
          </div>
        </div>
        <DatePicker
          availability={availability}
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
        />
      </div>

      {/* Step 2: Select Time */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            2
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Select a Time</h3>
          </div>
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

      {/* Step 3: Recurrence (Optional) */}
      {selectedDate && selectedTime && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground text-sm font-semibold">
              3
            </div>
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                Repeat Visit{" "}
                <span className="font-normal text-muted-foreground">
                  (Optional)
                </span>
              </h3>
            </div>
          </div>
          <RecurrenceSelector
            startDate={new Date(`${selectedDate}T${selectedTime}:00`)}
            recurrence={recurrence}
            recurrenceEndDate={recurrenceEndDate}
            onRecurrenceChange={setRecurrence}
            onEndDateChange={setRecurrenceEndDate}
          />
        </div>
      )}

      {/* Step 4: Select Child */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {selectedDate && selectedTime ? "4" : "3"}
          </div>
          <div className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Select Your Child</h3>
          </div>
        </div>
        <ChildSelector
          childList={children}
          selectedChildId={selectedChildId}
          onSelectChild={setSelectedChildId}
        />
      </div>

      {/* Step 5: Additional Notes (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground text-sm font-semibold">
            {selectedDate && selectedTime ? "5" : "4"}
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Additional Notes{" "}
              <span className="font-normal text-muted-foreground">
                (Optional)
              </span>
            </h3>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes" className="sr-only">
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Any questions or special requests for your visit?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>
      </div>

      {/* Summary and Submit */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-semibold">Booking Summary</h4>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Daycare:</span>{" "}
            {daycareName}
          </p>
          <p>
            <span className="text-muted-foreground">Date:</span>{" "}
            {selectedDate
              ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : "Not selected"}
          </p>
          <p>
            <span className="text-muted-foreground">Time:</span>{" "}
            {selectedTime
              ? new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString(
                  "en-US",
                  { hour: "numeric", minute: "2-digit" }
                )
              : "Not selected"}
          </p>
          <p>
            <span className="text-muted-foreground">Child:</span>{" "}
            {selectedChildId
              ? children.find((c) => c.id === selectedChildId)?.firstName +
                " " +
                children.find((c) => c.id === selectedChildId)?.lastName
              : "Not selected"}
          </p>
          <p>
            <span className="text-muted-foreground">Duration:</span> 30 minutes
          </p>
          {recurrence !== "NONE" && selectedDate && selectedTime && (
            <>
              <p>
                <span className="text-muted-foreground">Recurrence:</span>{" "}
                {getRecurrenceLabel(recurrence)}
              </p>
              <p>
                <span className="text-muted-foreground">Total visits:</span>{" "}
                {generateRecurringDates({
                  pattern: recurrence,
                  startDate: new Date(`${selectedDate}T${selectedTime}:00`),
                  endDate: recurrenceEndDate || new Date(new Date(`${selectedDate}T${selectedTime}:00`).getTime() + 90 * 24 * 60 * 60 * 1000),
                }).length}
              </p>
            </>
          )}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Booking...
          </>
        ) : (
          "Request Tour"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Your tour request will be sent to {daycareName} for confirmation.
        You&apos;ll receive a notification once they respond.
      </p>
    </form>
  );
}
