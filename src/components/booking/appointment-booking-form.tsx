"use client";

import { useState, useTransition } from "react";
import { Loader2, Calendar, Clock, User, FileText, Video, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "./date-picker";
import { TimeSlotGrid } from "./time-slot-grid";
import { FamilyMemberSelector } from "./family-member-selector";
import {
  createAppointment,
  type AppointmentInput,
} from "@/server/actions/appointments";
import {
  getSlotsForDate,
  type DayAvailability,
} from "@/lib/booking-utils";

interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  relationship: string;
}

interface AppointmentBookingFormProps {
  providerId: string;
  providerName: string;
  availability: DayAvailability[];
  familyMembers: FamilyMember[];
  offersTelehealth?: boolean;
}

export function AppointmentBookingForm({
  providerId,
  providerName,
  availability,
  familyMembers,
  offersTelehealth = false,
}: AppointmentBookingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<"IN_PERSON" | "TELEMEDICINE">("IN_PERSON");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [notes, setNotes] = useState("");

  const selectedSlots = selectedDate ? getSlotsForDate(availability, selectedDate) : [];

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedTime(null); // Reset time when date changes
  };

  const canSubmit = selectedDate && selectedTime && !isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

    const input: AppointmentInput = {
      providerId,
      familyMemberId: selectedFamilyMemberId || undefined,
      scheduledAt: scheduledAt.toISOString(),
      isTelemedicine: appointmentType === "TELEMEDICINE",
      isNewPatient: true,
      recurrence: "NONE",
      reasonForVisit: reasonForVisit.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      try {
        await createAppointment(input);
        // Redirect happens in the server action
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to book appointment"
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Appointment Type */}
      {offersTelehealth && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              1
            </div>
            <h3 className="text-lg font-semibold">Appointment Type</h3>
          </div>
          <RadioGroup
            value={appointmentType}
            onValueChange={(value) => setAppointmentType(value as "IN_PERSON" | "TELEMEDICINE")}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="in-person"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                appointmentType === "IN_PERSON"
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="IN_PERSON" id="in-person" className="sr-only" />
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">In-Person</p>
                <p className="text-sm text-muted-foreground">Visit the office</p>
              </div>
            </Label>
            <Label
              htmlFor="telemedicine"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                appointmentType === "TELEMEDICINE"
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="TELEMEDICINE" id="telemedicine" className="sr-only" />
              <Video className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Telemedicine</p>
                <p className="text-sm text-muted-foreground">Video visit</p>
              </div>
            </Label>
          </RadioGroup>
        </div>
      )}

      {/* Step 2: Select Date */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {offersTelehealth ? "2" : "1"}
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

      {/* Step 3: Select Time */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {offersTelehealth ? "3" : "2"}
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

      {/* Step 4: Select Family Member (Optional) */}
      {familyMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground text-sm font-semibold">
              {offersTelehealth ? "4" : "3"}
            </div>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                Who is this appointment for?{" "}
                <span className="font-normal text-muted-foreground">(Optional)</span>
              </h3>
            </div>
          </div>
          <FamilyMemberSelector
            members={familyMembers}
            selectedId={selectedFamilyMemberId}
            onSelect={setSelectedFamilyMemberId}
          />
        </div>
      )}

      {/* Step 5: Reason for Visit */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {offersTelehealth ? (familyMembers.length > 0 ? "5" : "4") : (familyMembers.length > 0 ? "4" : "3")}
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Reason for Visit</h3>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason" className="sr-only">
            Reason for Visit
          </Label>
          <Textarea
            id="reason"
            placeholder="What brings you in today? (e.g., Annual checkup, cold symptoms, follow-up)"
            value={reasonForVisit}
            onChange={(e) => setReasonForVisit(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Step 6: Additional Notes (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground text-sm font-semibold">
            {offersTelehealth ? (familyMembers.length > 0 ? "6" : "5") : (familyMembers.length > 0 ? "5" : "4")}
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Additional Notes{" "}
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
            placeholder="Any allergies, current medications, or other information the provider should know?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>
      </div>

      {/* Summary and Submit */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-semibold">Appointment Summary</h4>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Provider:</span>{" "}
            {providerName}
          </p>
          <p>
            <span className="text-muted-foreground">Type:</span>{" "}
            {appointmentType === "TELEMEDICINE" ? "Telemedicine (Video)" : "In-Person"}
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
          {selectedFamilyMemberId && (
            <p>
              <span className="text-muted-foreground">Patient:</span>{" "}
              {familyMembers.find((m) => m.id === selectedFamilyMemberId)?.firstName}{" "}
              {familyMembers.find((m) => m.id === selectedFamilyMemberId)?.lastName}
            </p>
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
          "Request Appointment"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Your appointment request will be sent to {providerName} for confirmation.
        You&apos;ll receive a notification once they respond.
      </p>
    </form>
  );
}
