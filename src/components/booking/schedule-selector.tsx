"use client";

import { Clock, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScheduleType = "full-time" | "part-time" | "before-after";

interface ScheduleOption {
  value: ScheduleType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const scheduleOptions: ScheduleOption[] = [
  {
    value: "full-time",
    label: "Full-Time",
    description: "Monday to Friday, full day care",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    value: "part-time",
    label: "Part-Time",
    description: "Half day or select days per week",
    icon: <Sun className="h-5 w-5" />,
  },
  {
    value: "before-after",
    label: "Before/After School",
    description: "Care before and/or after school hours",
    icon: <Moon className="h-5 w-5" />,
  },
];

interface ScheduleSelectorProps {
  selectedSchedule: ScheduleType | null;
  onSelectSchedule: (schedule: ScheduleType) => void;
}

export function ScheduleSelector({
  selectedSchedule,
  onSelectSchedule,
}: ScheduleSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {scheduleOptions.map((option) => {
        const isSelected = selectedSchedule === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectSchedule(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors",
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border hover:border-primary hover:bg-primary/5"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {option.icon}
            </div>
            <div>
              <p className="font-medium">{option.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
