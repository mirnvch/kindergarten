"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Ban,
  RotateCcw,
  Trash2,
  Star,
  ExternalLink,
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
  approveDaycare,
  rejectDaycare,
  suspendDaycare,
  reactivateDaycare,
  deleteDaycare,
  toggleFeatured,
} from "@/server/actions/admin/daycares";
import { toast } from "sonner";

interface DaycareActionsProps {
  daycareId: string;
  daycareSlug: string;
  status: string;
  isFeatured: boolean;
}

export function DaycareActions({
  daycareId,
  daycareSlug,
  status,
  isFeatured,
}: DaycareActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const result = await approveDaycare(daycareId);
      if (result.success) {
        toast.success("Daycare approved successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to approve daycare");
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
      const result = await rejectDaycare(daycareId);
      if (result.success) {
        toast.success("Daycare rejected");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reject daycare");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setShowRejectDialog(false);
    }
  };

  const handleSuspend = async () => {
    setIsLoading(true);
    try {
      const result = await suspendDaycare(daycareId);
      if (result.success) {
        toast.success("Daycare suspended");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to suspend daycare");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setShowSuspendDialog(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      const result = await reactivateDaycare(daycareId);
      if (result.success) {
        toast.success("Daycare reactivated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reactivate daycare");
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
      const result = await deleteDaycare(daycareId);
      if (result.success) {
        toast.success("Daycare deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete daycare");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleFeatured = async () => {
    setIsLoading(true);
    try {
      const result = await toggleFeatured(daycareId);
      if (result.success) {
        toast.success(result.isFeatured ? "Daycare featured" : "Daycare unfeatured");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to toggle featured status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const isPending = status === "PENDING";
  const isApproved = status === "APPROVED";
  const isSuspended = status === "SUSPENDED";
  const isRejected = status === "REJECTED";

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
            <a href={`/daycare/${daycareSlug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public Page
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Approve - only for pending */}
          {isPending && (
            <DropdownMenuItem onClick={handleApprove} className="text-green-600">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
          )}

          {/* Reject - only for pending */}
          {isPending && (
            <DropdownMenuItem
              onClick={() => setShowRejectDialog(true)}
              className="text-orange-600"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          )}

          {/* Suspend - only for approved */}
          {isApproved && (
            <DropdownMenuItem
              onClick={() => setShowSuspendDialog(true)}
              className="text-orange-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              Suspend
            </DropdownMenuItem>
          )}

          {/* Reactivate - for suspended or rejected */}
          {(isSuspended || isRejected) && (
            <DropdownMenuItem onClick={handleReactivate} className="text-green-600">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reactivate
            </DropdownMenuItem>
          )}

          {/* Toggle Featured - only for approved */}
          {isApproved && (
            <DropdownMenuItem onClick={handleToggleFeatured}>
              <Star className={`mr-2 h-4 w-4 ${isFeatured ? "fill-yellow-400 text-yellow-400" : ""}`} />
              {isFeatured ? "Remove Featured" : "Mark as Featured"}
            </DropdownMenuItem>
          )}

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

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Daycare</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this daycare? They will be notified
              and can resubmit their application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Daycare</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend this daycare? Their listing will
              be hidden from search results and they won&apos;t receive new bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Daycare</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this daycare? This action cannot be
              undone and will remove all associated data including bookings,
              reviews, and messages.
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
