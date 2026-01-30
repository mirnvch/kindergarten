"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  startVerificationReview,
  reviewVerificationRequest,
} from "@/server/actions/verification";
import { VerificationStatus } from "@prisma/client";

interface VerificationReviewFormProps {
  requestId: string;
  status: VerificationStatus;
}

export function VerificationReviewForm({
  requestId,
  status,
}: VerificationReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const handleStartReview = () => {
    startTransition(async () => {
      const result = await startVerificationReview(requestId);
      if (result.success) {
        toast.success("Review started");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to start review");
      }
    });
  };

  const handleApprove = () => {
    startTransition(async () => {
      const result = await reviewVerificationRequest({
        requestId,
        status: "APPROVED",
        reviewNotes: reviewNotes.trim() || undefined,
      });
      if (result.success) {
        toast.success("Verification approved!");
        router.push("/admin/verifications");
      } else {
        toast.error(result.error || "Failed to approve");
      }
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    startTransition(async () => {
      const result = await reviewVerificationRequest({
        requestId,
        status: "REJECTED",
        reviewNotes: reviewNotes.trim() || undefined,
        rejectionReason: rejectionReason.trim(),
      });
      if (result.success) {
        toast.success("Verification rejected");
        router.push("/admin/verifications");
      } else {
        toast.error(result.error || "Failed to reject");
      }
    });
  };

  if (status === "PENDING") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Review</CardTitle>
          <CardDescription>
            Click the button below to start reviewing this verification request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleStartReview} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Start Review
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Decision</CardTitle>
        <CardDescription>
          Review the submitted documents and make a decision
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
          <Textarea
            id="reviewNotes"
            placeholder="Add any notes about your review..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            These notes are for internal reference only.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rejectionReason">Rejection Reason (Required if rejecting)</Label>
          <Textarea
            id="rejectionReason"
            placeholder="e.g., License number could not be verified, documents are unclear..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This will be visible to the daycare owner.
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Verification
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isPending || !rejectionReason.trim()}
            className="flex-1"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Reject Verification
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
