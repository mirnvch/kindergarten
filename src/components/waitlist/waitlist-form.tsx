"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ClipboardList, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { joinWaitlist } from "@/server/actions/waitlist";

const formSchema = z.object({
  patientName: z.string().min(1, "Name is required"),
  patientEmail: z.string().email("Valid email is required"),
  patientPhone: z.string().optional(),
  desiredDate: z.string().min(1, "Desired date is required"),
  reasonForVisit: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface WaitlistFormProps {
  providerId: string;
  providerName: string;
  defaultEmail?: string;
  defaultName?: string;
  // Legacy compatibility (optional)
  daycareId?: string;
  daycareName?: string;
  spotsAvailable?: number;
  capacity?: number;
  enrolled?: number;
}

export function WaitlistForm({
  providerId,
  providerName,
  defaultEmail = "",
  defaultName = "",
  daycareId,
  daycareName,
}: WaitlistFormProps) {
  // Support legacy props
  const entityId = providerId || daycareId || "";
  const entityName = providerName || daycareName || "";
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: defaultName,
      patientEmail: defaultEmail,
      patientPhone: "",
      desiredDate: "",
      reasonForVisit: "",
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    const result = await joinWaitlist({
      providerId: entityId,
      ...data,
    });

    if (result.success) {
      setPosition(result.data?.position || null);
      toast.success("Successfully joined the waitlist!");
    } else {
      toast.error(result.error || "Failed to join waitlist");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPosition(null);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="lg">
          <ClipboardList className="h-4 w-4 mr-2" />
          Join Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {position ? (
          <>
            <DialogHeader>
              <DialogTitle>You&apos;re on the Waitlist!</DialogTitle>
              <DialogDescription>
                Your position: <strong>#{position}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-primary">#{position}</div>
                <p className="text-muted-foreground">
                  You&apos;ve been added to the waitlist for{" "}
                  <strong>{entityName}</strong>. We&apos;ll notify you when an
                  appointment becomes available.
                </p>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Join Waitlist</DialogTitle>
              <DialogDescription>
                Join the waitlist for {entityName} to be notified when an appointment becomes available.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Your Name</Label>
                <Input
                  id="patientName"
                  {...register("patientName")}
                  placeholder="John Smith"
                />
                {errors.patientName && (
                  <p className="text-sm text-destructive">{errors.patientName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientEmail">Email</Label>
                <Input
                  id="patientEmail"
                  type="email"
                  {...register("patientEmail")}
                  placeholder="john@example.com"
                />
                {errors.patientEmail && (
                  <p className="text-sm text-destructive">{errors.patientEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientPhone">Phone (optional)</Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  {...register("patientPhone")}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reasonForVisit">Reason for Visit (optional)</Label>
                <Input
                  id="reasonForVisit"
                  {...register("reasonForVisit")}
                  placeholder="Annual checkup, consultation, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desiredDate">Desired Appointment Date</Label>
                <Input
                  id="desiredDate"
                  type="date"
                  {...register("desiredDate")}
                  min={new Date().toISOString().split("T")[0]}
                />
                {errors.desiredDate && (
                  <p className="text-sm text-destructive">{errors.desiredDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional information..."
                  rows={3}
                />
                {errors.notes && (
                  <p className="text-sm text-destructive">{errors.notes.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
