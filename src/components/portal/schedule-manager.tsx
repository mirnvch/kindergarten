"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateSchedule,
  type ScheduleDay,
} from "@/server/actions/portal/schedule";
import { toast } from "sonner";

interface Schedule {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface ScheduleManagerProps {
  schedule: Schedule[];
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DEFAULT_SCHEDULE: ScheduleDay[] = DAYS.map((day) => ({
  dayOfWeek: day.value,
  openTime: "07:00",
  closeTime: "18:00",
  isClosed: day.value === 0 || day.value === 6, // Closed on weekends by default
}));

export function ScheduleManager({ schedule }: ScheduleManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Merge existing schedule with defaults
  const initialSchedule = DAYS.map((day) => {
    const existing = schedule.find((s) => s.dayOfWeek === day.value);
    if (existing) {
      return {
        dayOfWeek: existing.dayOfWeek,
        openTime: existing.openTime,
        closeTime: existing.closeTime,
        isClosed: existing.isClosed,
      };
    }
    return DEFAULT_SCHEDULE[day.value];
  });

  const [scheduleData, setScheduleData] =
    useState<ScheduleDay[]>(initialSchedule);

  const updateDay = (
    dayOfWeek: number,
    field: keyof ScheduleDay,
    value: string | boolean
  ) => {
    setScheduleData((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateSchedule(scheduleData);
      if (result.success) {
        toast.success("Schedule updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update schedule");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToAll = (dayOfWeek: number) => {
    const sourceDay = scheduleData.find((s) => s.dayOfWeek === dayOfWeek);
    if (!sourceDay) return;

    setScheduleData((prev) =>
      prev.map((s) =>
        s.dayOfWeek !== dayOfWeek
          ? {
              ...s,
              openTime: sourceDay.openTime,
              closeTime: sourceDay.closeTime,
              isClosed: sourceDay.isClosed,
            }
          : s
      )
    );
    toast.success("Copied to all days");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Operating Hours
        </CardTitle>
        <CardDescription>
          Set your daycare&apos;s operating hours for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {DAYS.map((day) => {
              const dayData = scheduleData.find(
                (s) => s.dayOfWeek === day.value
              )!;
              return (
                <div
                  key={day.value}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <div className="w-28">
                    <span className="font-medium">{day.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!dayData.isClosed}
                      onCheckedChange={(checked) =>
                        updateDay(day.value, "isClosed", !checked)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {dayData.isClosed ? "Closed" : "Open"}
                    </span>
                  </div>

                  {!dayData.isClosed && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`open-${day.value}`} className="sr-only">
                          Open time
                        </Label>
                        <Input
                          id={`open-${day.value}`}
                          type="time"
                          value={dayData.openTime}
                          onChange={(e) =>
                            updateDay(day.value, "openTime", e.target.value)
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Label
                          htmlFor={`close-${day.value}`}
                          className="sr-only"
                        >
                          Close time
                        </Label>
                        <Input
                          id={`close-${day.value}`}
                          type="time"
                          value={dayData.closeTime}
                          onChange={(e) =>
                            updateDay(day.value, "closeTime", e.target.value)
                          }
                          className="w-32"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToAll(day.value)}
                        className="text-xs"
                      >
                        Copy to all
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Schedule"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
