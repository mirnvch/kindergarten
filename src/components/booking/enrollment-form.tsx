"use client";

import { useState, useTransition } from "react";
import { Loader2, Baby, GraduationCap, Clock, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChildSelector } from "./child-selector";
import { ProgramSelector } from "./program-selector";
import { ScheduleSelector, type ScheduleType } from "./schedule-selector";
import {
  createEnrollmentRequest,
  type EnrollmentInput,
} from "@/server/actions/bookings";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  ageMin: number;
  ageMax: number;
  price: number;
  schedule: string | null;
}

interface EnrollmentFormProps {
  providerId: string;
  providerName: string;
  programs: Program[];
  childProfiles: Child[];
}

export function EnrollmentForm({
  providerId,
  providerName,
  programs,
  childProfiles,
}: EnrollmentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType | null>(null);
  const [desiredStartDate, setDesiredStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit =
    selectedChildId && selectedSchedule && desiredStartDate && !isPending;

  // Calculate minimum start date (at least 1 week from now)
  const minStartDate = new Date();
  minStartDate.setDate(minStartDate.getDate() + 7);
  const minStartDateString = minStartDate.toISOString().split("T")[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedChildId || !selectedSchedule || !desiredStartDate) {
      toast.error("Please complete all required fields");
      return;
    }

    const input: EnrollmentInput = {
      providerId,
      familyMemberId: selectedChildId,
      programId: selectedProgramId || undefined,
      schedule: selectedSchedule,
      desiredStartDate,
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      try {
        await createEnrollmentRequest(input);
        // Redirect happens in the server action
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to submit enrollment request"
        );
      }
    });
  };

  const selectedChild = childProfiles.find((c) => c.id === selectedChildId);
  const selectedProgram = programs.find((p) => p.id === selectedProgramId);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Select Child */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            1
          </div>
          <div className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Select Your Child</h3>
          </div>
        </div>
        <ChildSelector
          childList={childProfiles}
          selectedChildId={selectedChildId}
          onSelectChild={setSelectedChildId}
        />
      </div>

      {/* Step 2: Select Program (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-sm font-semibold text-muted-foreground">
            2
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Select a Program{" "}
              <span className="font-normal text-muted-foreground">(Optional)</span>
            </h3>
          </div>
        </div>
        <ProgramSelector
          programs={programs}
          selectedProgramId={selectedProgramId}
          onSelectProgram={setSelectedProgramId}
        />
      </div>

      {/* Step 3: Select Schedule */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            3
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Select Schedule Preference</h3>
          </div>
        </div>
        <ScheduleSelector
          selectedSchedule={selectedSchedule}
          onSelectSchedule={setSelectedSchedule}
        />
      </div>

      {/* Step 4: Desired Start Date */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            4
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Desired Start Date</h3>
          </div>
        </div>
        <div className="max-w-xs">
          <Label htmlFor="startDate" className="sr-only">
            Start Date
          </Label>
          <Input
            id="startDate"
            type="date"
            value={desiredStartDate}
            onChange={(e) => setDesiredStartDate(e.target.value)}
            min={minStartDateString}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Select when you&apos;d like your child to start. Final date will be
            confirmed by the daycare.
          </p>
        </div>
      </div>

      {/* Step 5: Additional Notes (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-sm font-semibold text-muted-foreground">
            5
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Additional Information{" "}
              <span className="font-normal text-muted-foreground">(Optional)</span>
            </h3>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes" className="sr-only">
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Share any additional information about your child or specific requirements..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>
      </div>

      {/* Summary and Submit */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-semibold">Enrollment Summary</h4>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Provider:</span>{" "}
            {providerName}
          </p>
          <p>
            <span className="text-muted-foreground">Child:</span>{" "}
            {selectedChild
              ? `${selectedChild.firstName} ${selectedChild.lastName}`
              : "Not selected"}
          </p>
          <p>
            <span className="text-muted-foreground">Program:</span>{" "}
            {selectedProgram ? selectedProgram.name : "Not specified"}
          </p>
          <p>
            <span className="text-muted-foreground">Schedule:</span>{" "}
            {selectedSchedule
              ? selectedSchedule === "full-time"
                ? "Full-Time"
                : selectedSchedule === "part-time"
                  ? "Part-Time"
                  : "Before/After School"
              : "Not selected"}
          </p>
          <p>
            <span className="text-muted-foreground">Desired Start:</span>{" "}
            {desiredStartDate
              ? new Date(desiredStartDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not selected"}
          </p>
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
            Submitting...
          </>
        ) : (
          "Submit Enrollment Request"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Your enrollment request will be reviewed by {providerName}. They will
        contact you to discuss next steps and availability.
      </p>
    </form>
  );
}
