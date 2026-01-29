"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getAvailableSlotsCount,
  type DayAvailability,
} from "@/lib/booking-utils";

interface DatePickerProps {
  availability: DayAvailability[];
  selectedDate: string | null;
  onSelectDate: (dateString: string) => void;
}

export function DatePicker({
  availability,
  selectedDate,
  onSelectDate,
}: DatePickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background shadow-md"
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto px-10 py-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {availability.map((day) => {
          const availableCount = getAvailableSlotsCount(day);
          const isSelected = selectedDate === day.dateString;
          const isDisabled = !day.isOpen || availableCount === 0;

          return (
            <button
              key={day.dateString}
              type="button"
              onClick={() => !isDisabled && onSelectDate(day.dateString)}
              disabled={isDisabled}
              className={cn(
                "flex min-w-[80px] flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDisabled
                    ? "cursor-not-allowed border-muted bg-muted/50 text-muted-foreground"
                    : "border-border bg-background hover:border-primary hover:bg-primary/5"
              )}
            >
              <span className="text-xs font-medium">{day.dayName}</span>
              <span className="text-lg font-semibold">
                {day.date.getDate()}
              </span>
              <span className="text-xs">
                {day.date.toLocaleDateString("en-US", { month: "short" })}
              </span>
              {!isDisabled && (
                <span
                  className={cn(
                    "text-[10px]",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {availableCount} slots
                </span>
              )}
              {isDisabled && day.isOpen && (
                <span className="text-[10px] text-muted-foreground">Full</span>
              )}
              {!day.isOpen && (
                <span className="text-[10px] text-muted-foreground">Closed</span>
              )}
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background shadow-md"
        onClick={() => scroll("right")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
