"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  startVerificationReview,
  reviewVerificationRequest,
} from "@/server/actions/verification";
import { VerificationStatus } from "@prisma/client";

interface VerificationActionsProps {
  requestId: string;
  status: VerificationStatus;
  providerId?: string;
  daycareId?: string; // Legacy support
}

export function VerificationActions({
  requestId,
  status,
  providerId,
  daycareId,
}: VerificationActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Support both providerId and daycareId (legacy)
  // Note: providerId/daycareId kept for future use in provider linking
  void (providerId || daycareId);

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
        toast.success("Verification approved");
        setShowApproveDialog(false);
        setReviewNotes("");
        router.refresh();
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
        setShowRejectDialog(false);
        setReviewNotes("");
        setRejectionReason("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reject");
      }
    });
  };

  const canReview = status === "PENDING" || status === "IN_REVIEW";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a
              href={`/admin/verifications/${requestId}`}
              className="flex items-center"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </a>
          </DropdownMenuItem>

          {status === "PENDING" && (
            <DropdownMenuItem onClick={handleStartReview}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Review
            </DropdownMenuItem>
          )}

          {canReview && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowApproveDialog(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRejectDialog(true)}>
                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                Reject
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Verification</DialogTitle>
            <DialogDescription>
              This will mark the provider as verified and display the verification
              badge on their listing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approveNotes">Review Notes (Optional)</Label>
              <Textarea
                id="approveNotes"
                placeholder="Add any notes about your review..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be visible to the
              provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="e.g., License number could not be verified..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectNotes">Internal Notes (Optional)</Label>
              <Textarea
                id="rejectNotes"
                placeholder="Add any internal notes..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !rejectionReason.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
