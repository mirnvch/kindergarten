"use client";

import { useState } from "react";
import { CalendarDays, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  generateRecurringDates,
  getDefaultRecurrenceEndDate,
  type RecurrencePattern,
} from "@/lib/booking-utils";
import { format, addMonths } from "date-fns";

interface RecurrenceSelectorProps {
  startDate: Date | null;
  recurrence: RecurrencePattern;
  recurrenceEndDate: Date | null;
  onRecurrenceChange: (pattern: RecurrencePattern) => void;
  onEndDateChange: (date: Date | null) => void;
}

const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string; description: string }[] = [
  { value: "NONE", label: "One-time", description: "Single visit only" },
  { value: "WEEKLY", label: "Weekly", description: "Same day & time every week" },
  { value: "BIWEEKLY", label: "Every 2 weeks", description: "Same day & time every 2 weeks" },
  { value: "MONTHLY", label: "Monthly", description: "Same day & time every month" },
];

export function RecurrenceSelector({
  startDate,
  recurrence,
  recurrenceEndDate,
  onRecurrenceChange,
  onEndDateChange,
}: RecurrenceSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const isRecurring = recurrence !== "NONE";

  // Calculate preview dates when recurring
  const previewDates = startDate && isRecurring
    ? generateRecurringDates({
        pattern: recurrence,
        startDate,
        endDate: recurrenceEndDate || getDefaultRecurrenceEndDate(startDate),
      })
    : [];

  // Set default end date when recurrence is selected
  const handleRecurrenceChange = (value: RecurrencePattern) => {
    onRecurrenceChange(value);
    if (value !== "NONE" && startDate && !recurrenceEndDate) {
      onEndDateChange(getDefaultRecurrenceEndDate(startDate));
    }
  };

  // Min and max dates for end date picker
  const minEndDate = startDate ? new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) : new Date();
  const maxEndDate = startDate ? addMonths(startDate, 6) : addMonths(new Date(), 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Repeat Visit</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              <p>Set up recurring visits to tour the daycare regularly. All visits will be requested at once.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <RadioGroup
        value={recurrence}
        onValueChange={(v) => handleRecurrenceChange(v as RecurrencePattern)}
        className="grid grid-cols-2 gap-3"
      >
        {RECURRENCE_OPTIONS.map((option) => (
          <Label
            key={option.value}
            htmlFor={`recurrence-${option.value}`}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors",
              recurrence === option.value
                ? "border-primary bg-primary/5"
                : "border-muted hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem
                id={`recurrence-${option.value}`}
                value={option.value}
              />
              <span className="font-medium">{option.label}</span>
            </div>
            <span className="text-xs text-muted-foreground pl-6">
              {option.description}
            </span>
          </Label>
        ))}
      </RadioGroup>

      {/* End date picker for recurring bookings */}
      {isRecurring && startDate && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label>Repeat until</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !recurrenceEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {recurrenceEndDate
                    ? format(recurrenceEndDate, "MMM d, yyyy")
                    : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={recurrenceEndDate || undefined}
                  onSelect={(date) => {
                    onEndDateChange(date || null);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) => date < minEndDate || date > maxEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview of scheduled dates */}
          {previewDates.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium mb-2">
                {previewDates.length} visit{previewDates.length > 1 ? "s" : ""} will be scheduled:
              </p>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {previewDates.map((date, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    {format(date, "EEE, MMM d, yyyy 'at' h:mm a")}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
