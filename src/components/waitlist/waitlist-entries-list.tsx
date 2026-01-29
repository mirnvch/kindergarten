"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { MapPin, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { leaveWaitlist } from "@/server/actions/waitlist";

interface WaitlistEntry {
  id: string;
  daycareId: string;
  position: number;
  createdAt: Date;
  daycare: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
  };
}

interface WaitlistEntriesListProps {
  entries: WaitlistEntry[];
}

export function WaitlistEntriesList({ entries }: WaitlistEntriesListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const handleLeave = async (daycareId: string, entryId: string) => {
    setLoadingId(entryId);
    const result = await leaveWaitlist(daycareId);
    setLoadingId(null);

    if (result.success) {
      setRemovedIds((prev) => [...prev, entryId]);
      toast.success("Removed from waitlist");
    } else {
      toast.error(result.error || "Failed to leave waitlist");
    }
  };

  const visibleEntries = entries.filter((e) => !removedIds.includes(e.id));

  if (visibleEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        You&apos;re not on any waitlists.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visibleEntries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/daycare/${entry.daycare.slug}`}
                className="font-medium hover:underline truncate"
              >
                {entry.daycare.name}
              </Link>
              <Badge variant="outline" className="shrink-0">
                #{entry.position}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {entry.daycare.city}, {entry.daycare.state}
              </span>
              <span>
                Joined {format(new Date(entry.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive shrink-0"
                disabled={loadingId === entry.id}
              >
                {loadingId === entry.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave waitlist?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave the waitlist for{" "}
                  <strong>{entry.daycare.name}</strong>? You&apos;ll lose your
                  position (#{entry.position}) and will need to rejoin if you
                  change your mind.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleLeave(entry.daycareId, entry.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Leave Waitlist
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
