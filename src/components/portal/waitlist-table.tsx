"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Bell, Trash2, Mail, Phone, Calendar, Loader2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  notifyWaitlistEntry,
  removeFromWaitlist,
} from "@/server/actions/waitlist";

interface WaitlistEntry {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string | null;
  reasonForVisit: string | null;
  desiredDate: Date;
  notes: string | null;
  position: number;
  createdAt: Date;
  notifiedAt: Date | null;
}

interface WaitlistTableProps {
  entries: WaitlistEntry[];
  showNotified: boolean;
}

export function WaitlistTable({ entries, showNotified }: WaitlistTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleNotify = async (entryId: string) => {
    setLoadingId(entryId);
    const result = await notifyWaitlistEntry(entryId);
    setLoadingId(null);

    if (result.success) {
      toast.success("Patient notified successfully!");
    } else {
      toast.error(result.error || "Failed to notify");
    }
  };

  const handleRemove = async (entryId: string) => {
    setLoadingId(entryId);
    const result = await removeFromWaitlist(entryId);
    setLoadingId(null);

    if (result.success) {
      toast.success("Removed from waitlist");
    } else {
      toast.error(result.error || "Failed to remove");
    }
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {!showNotified && <TableHead className="w-16">#</TableHead>}
              <TableHead>Patient</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Desired Date</TableHead>
              <TableHead>
                {showNotified ? "Notified" : "Joined"}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                {!showNotified && (
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {entry.position}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  <div className="font-medium">{entry.patientName}</div>
                  {entry.notes && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help">
                          Has notes
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {entry.notes}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <a
                      href={`mailto:${entry.patientEmail}`}
                      className="flex items-center gap-1 text-sm hover:text-primary"
                    >
                      <Mail className="h-3 w-3" />
                      {entry.patientEmail}
                    </a>
                    {entry.patientPhone && (
                      <a
                        href={`tel:${entry.patientPhone}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                      >
                        <Phone className="h-3 w-3" />
                        {entry.patientPhone}
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {entry.reasonForVisit ? (
                    <div className="flex items-center gap-1 text-sm">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="max-w-[150px] truncate">{entry.reasonForVisit}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {format(new Date(entry.desiredDate), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(
                      new Date(showNotified ? entry.notifiedAt! : entry.createdAt),
                      "MMM d, yyyy"
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!showNotified && (
                      <Button
                        size="sm"
                        onClick={() => handleNotify(entry.id)}
                        disabled={loadingId === entry.id}
                      >
                        {loadingId === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Bell className="h-4 w-4 mr-1" />
                            Notify
                          </>
                        )}
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={loadingId === entry.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from waitlist?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {entry.patientName} from the waitlist.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(entry.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
