"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Calendar, User, Mail, Phone, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  approveEnrollment,
  declineEnrollment,
  completeEnrollment,
  type PortalEnrollment,
} from "@/server/actions/portal-enrollments";

interface EnrollmentCardProps {
  enrollment: PortalEnrollment;
  showActions?: boolean;
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export function EnrollmentCard({ enrollment, showActions = false }: EnrollmentCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await approveEnrollment(enrollment.id);
        toast.success("Enrollment approved");
      } catch {
        toast.error("Failed to approve enrollment");
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      try {
        await declineEnrollment(enrollment.id);
        toast.success("Enrollment declined");
        setShowDeclineDialog(false);
      } catch {
        toast.error("Failed to decline enrollment");
      }
    });
  };

  const handleComplete = () => {
    startTransition(async () => {
      try {
        await completeEnrollment(enrollment.id);
        toast.success("Enrollment marked as completed");
        setShowCompleteDialog(false);
      } catch {
        toast.error("Failed to complete enrollment");
      }
    });
  };

  const childAge = Math.floor(
    (new Date().getTime() - new Date(enrollment.child.dateOfBirth).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
  );

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              {/* Status and Schedule badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusBadgeVariant(enrollment.status)}>
                  {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                </Badge>
                <Badge variant="outline">{enrollment.schedule}</Badge>
              </div>

              {/* Child info */}
              <div className="flex items-center gap-2 text-lg font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                {enrollment.child.firstName} {enrollment.child.lastName}
                <span className="text-sm text-muted-foreground">
                  ({childAge} years old)
                </span>
              </div>

              {/* Parent info */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Parent: {enrollment.child.parent.firstName}{" "}
                  {enrollment.child.parent.lastName}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  {enrollment.child.parent.email}
                </div>
                {enrollment.child.parent.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {enrollment.child.parent.phone}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Start: {format(new Date(enrollment.startDate), "PPP")}
                {enrollment.endDate && (
                  <> — End: {format(new Date(enrollment.endDate), "PPP")}</>
                )}
              </div>

              {/* Monthly rate */}
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">
                  ${enrollment.monthlyRate.toFixed(2)}/month
                </span>
              </div>

              {/* Notes */}
              {enrollment.notes && (
                <p className="text-sm text-muted-foreground">{enrollment.notes}</p>
              )}
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex flex-shrink-0 gap-2">
                {enrollment.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      disabled={isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeclineDialog(true)}
                      disabled={isPending}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {enrollment.status === "active" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCompleteDialog(true)}
                      disabled={isPending}
                    >
                      Mark Completed
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDeclineDialog(true)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {enrollment.status === "pending" ? "Decline" : "Cancel"} Enrollment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {enrollment.status === "pending" ? "decline" : "cancel"} this enrollment for{" "}
              {enrollment.child.firstName} {enrollment.child.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {enrollment.status === "pending" ? "Decline" : "Cancel"} Enrollment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Enrollment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this enrollment as completed? This will end the enrollment for{" "}
              {enrollment.child.firstName} {enrollment.child.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={isPending}>
              Mark Completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
