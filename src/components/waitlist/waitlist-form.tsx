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
  parentName: z.string().min(1, "Name is required"),
  parentEmail: z.string().email("Valid email is required"),
  parentPhone: z.string().optional(),
  childAge: z.number().min(0, "Age must be positive").max(144, "Age must be under 12 years"),
  desiredStart: z.string().min(1, "Desired start date is required"),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface WaitlistFormProps {
  daycareId: string;
  daycareName: string;
  defaultEmail?: string;
  defaultName?: string;
  spotsAvailable: number;
  capacity: number;
  enrolled: number;
}

export function WaitlistForm({
  daycareId,
  daycareName,
  defaultEmail = "",
  defaultName = "",
  spotsAvailable,
  capacity,
  enrolled,
}: WaitlistFormProps) {
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
      parentName: defaultName,
      parentEmail: defaultEmail,
      parentPhone: "",
      childAge: 24,
      desiredStart: "",
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    const result = await joinWaitlist({
      daycareId,
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
                  <strong>{daycareName}</strong>. We&apos;ll notify you when a spot
                  becomes available.
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
                {daycareName} is currently full ({enrolled}/{capacity} spots).
                Join the waitlist to be notified when a spot opens.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="parentName">Your Name</Label>
                <Input
                  id="parentName"
                  {...register("parentName")}
                  placeholder="John Smith"
                />
                {errors.parentName && (
                  <p className="text-sm text-destructive">{errors.parentName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  {...register("parentEmail")}
                  placeholder="john@example.com"
                />
                {errors.parentEmail && (
                  <p className="text-sm text-destructive">{errors.parentEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone (optional)</Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  {...register("parentPhone")}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="childAge">Child&apos;s Age (months)</Label>
                <Input
                  id="childAge"
                  type="number"
                  {...register("childAge", { valueAsNumber: true })}
                  placeholder="24"
                  min={0}
                  max={144}
                />
                {errors.childAge && (
                  <p className="text-sm text-destructive">{errors.childAge.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="desiredStart">Desired Start Date</Label>
                <Input
                  id="desiredStart"
                  type="date"
                  {...register("desiredStart")}
                  min={new Date().toISOString().split("T")[0]}
                />
                {errors.desiredStart && (
                  <p className="text-sm text-destructive">{errors.desiredStart.message}</p>
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
