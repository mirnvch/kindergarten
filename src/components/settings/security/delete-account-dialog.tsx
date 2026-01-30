"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getAccountDeletionStatus,
} from "@/server/actions/security/account-deletion";

interface DeleteAccountDialogProps {
  hasPassword: boolean;
}

export function DeleteAccountDialog({ hasPassword }: DeleteAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    isScheduled: boolean;
    scheduledAt: Date | null;
    daysRemaining: number | null;
  } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchDeletionStatus = async () => {
    try {
      const result = await getAccountDeletionStatus();
      if (result.success && result.data) {
        setDeletionStatus(result.data);
      }
    } catch {
      console.error("Failed to fetch deletion status");
    }
  };

  useEffect(() => {
    fetchDeletionStatus();
  }, []);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    if (hasPassword && !password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const result = await requestAccountDeletion(password);

      if (!result.success) {
        toast.error(result.error || "Failed to schedule deletion");
        return;
      }

      toast.success("Account deletion scheduled. Check your email for details.");
      setIsOpen(false);
      setPassword("");
      setConfirmText("");
      fetchDeletionStatus();
    } catch {
      toast.error("Failed to schedule account deletion");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setCancelling(true);

    try {
      const result = await cancelAccountDeletion();

      if (!result.success) {
        toast.error(result.error || "Failed to cancel deletion");
        return;
      }

      toast.success("Account deletion cancelled");
      setShowCancelConfirm(false);
      setDeletionStatus(null);
    } catch {
      toast.error("Failed to cancel deletion");
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600">Delete Account</CardTitle>
          </div>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deletionStatus?.isScheduled ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-600">
                      Account scheduled for deletion
                    </p>
                    <p className="mt-1 text-sm text-red-600/80">
                      Your account will be permanently deleted on{" "}
                      <strong>
                        {deletionStatus.scheduledAt
                          ? formatDate(deletionStatus.scheduledAt)
                          : "soon"}
                      </strong>
                      .
                    </p>
                    {deletionStatus.daysRemaining !== null && (
                      <p className="mt-1 text-sm text-red-600/80">
                        {deletionStatus.daysRemaining} day
                        {deletionStatus.daysRemaining !== 1 ? "s" : ""} remaining.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Deletion
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-amber-50 p-4 text-amber-700">
                <p className="text-sm">
                  <strong>Warning:</strong> This action is irreversible. After
                  the grace period, all your data will be permanently deleted
                  including:
                </p>
                <ul className="mt-2 list-inside list-disc text-sm">
                  <li>Your profile and account information</li>
                  <li>Children profiles</li>
                  <li>Bookings and appointments</li>
                  <li>Messages and conversations</li>
                  <li>Reviews (will be anonymized)</li>
                </ul>
              </div>

              <Button
                variant="destructive"
                onClick={() => setIsOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This will schedule your account for deletion. You&apos;ll have 14 days
              to cancel before your data is permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="delete-password">
                  Enter your password to confirm
                </Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-mono font-bold">DELETE</span> to
                confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || confirmText !== "DELETE" || (hasPassword && !password)}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Deletion Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Account Deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be restored and the scheduled deletion will be
              cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelDeletion}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Yes, Keep My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
