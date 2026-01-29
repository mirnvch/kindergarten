"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Baby } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteChild } from "@/server/actions/children";
import { calculateAge } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

interface ChildCardProps {
  child: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string | null;
    allergies: string | null;
    specialNeeds: string | null;
  };
}

export function ChildCard({ child }: ChildCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const age = calculateAge(new Date(child.dateOfBirth));

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteChild(child.id);
        toast.success("Child profile deleted");
        setShowDeleteDialog(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete"
        );
      }
    });
  }

  const formatAge = () => {
    if (age.years === 0) {
      return `${age.months} month${age.months !== 1 ? "s" : ""} old`;
    }
    if (age.months === 0) {
      return `${age.years} year${age.years !== 1 ? "s" : ""} old`;
    }
    return `${age.years} yr${age.years !== 1 ? "s" : ""} ${age.months} mo old`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Baby className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {child.firstName} {child.lastName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{formatAge()}</p>
          </div>
        </div>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/parent/children/${child.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DialogTrigger asChild>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Child Profile</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {child.firstName}&apos;s profile?
                This action cannot be undone and will remove all associated
                bookings and enrollments.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {child.gender && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Gender:</span>
              <span className="text-sm capitalize">
                {child.gender.replace("_", " ")}
              </span>
            </div>
          )}

          {child.allergies && (
            <div>
              <span className="text-sm text-muted-foreground">Allergies:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {child.allergies.split(",").map((allergy, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {allergy.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {child.specialNeeds && (
            <div>
              <span className="text-sm text-muted-foreground">
                Special Needs:
              </span>
              <p className="mt-1 text-sm">{child.specialNeeds}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
