"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Trash2,
  BadgeCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  approveReview,
  rejectReview,
  deleteReview,
  toggleVerified,
} from "@/server/actions/admin/reviews";
import { toast } from "sonner";

interface ReviewActionsProps {
  reviewId: string;
  daycareSlug: string;
  isApproved: boolean;
  isVerified: boolean;
}

export function ReviewActions({
  reviewId,
  daycareSlug,
  isApproved,
  isVerified,
}: ReviewActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const result = await approveReview(reviewId);
      if (result.success) {
        toast.success("Review approved");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to approve review");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      const result = await rejectReview(reviewId);
      if (result.success) {
        toast.success("Review rejected");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reject review");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteReview(reviewId);
      if (result.success) {
        toast.success("Review deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete review");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleVerified = async () => {
    setIsLoading(true);
    try {
      const result = await toggleVerified(reviewId);
      if (result.success) {
        toast.success(result.isVerified ? "Review verified" : "Verification removed");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to toggle verified");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/daycare/${daycareSlug}`} target="_blank" rel="noopener">
              <Eye className="mr-2 h-4 w-4" />
              View Daycare
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {!isApproved && (
            <DropdownMenuItem onClick={handleApprove} className="text-green-600">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
          )}

          {isApproved && (
            <DropdownMenuItem onClick={handleReject} className="text-orange-600">
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={handleToggleVerified}>
            <BadgeCheck className={`mr-2 h-4 w-4 ${isVerified ? "text-blue-600" : ""}`} />
            {isVerified ? "Remove Verified" : "Mark as Verified"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
