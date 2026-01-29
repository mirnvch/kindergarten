"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeForDisplay, type TimeSlot } from "@/lib/booking-utils";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export function TimeSlotGrid({
  slots,
  selectedTime,
  onSelectTime,
}: TimeSlotGridProps) {
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <Clock className="mb-2 h-8 w-8" />
        <p>No time slots available for this date.</p>
        <p className="text-sm">Please select another date.</p>
      </div>
    );
  }

  const availableSlots = slots.filter((slot) => slot.available);

  if (availableSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <Clock className="mb-2 h-8 w-8" />
        <p>All time slots are booked for this date.</p>
        <p className="text-sm">Please select another date.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {slots.map((slot) => {
        const isSelected = selectedTime === slot.time;
        const isDisabled = !slot.available;

        return (
          <button
            key={slot.time}
            type="button"
            onClick={() => !isDisabled && onSelectTime(slot.time)}
            disabled={isDisabled}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : isDisabled
                  ? "cursor-not-allowed border-muted bg-muted/50 text-muted-foreground line-through"
                  : "border-border bg-background hover:border-primary hover:bg-primary/5"
            )}
          >
            {formatTimeForDisplay(slot.time)}
          </button>
        );
      })}
    </div>
  );
}
