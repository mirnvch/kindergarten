"use client";

import { useState, useTransition } from "react";
import { Send, Users, Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendBulkMessage } from "@/server/actions/bulk-messaging";
import { toast } from "sonner";
import Link from "next/link";

interface BulkMessageDialogProps {
  hasBulkMessaging: boolean;
  counts: {
    all: number;
    enrolled: number;
    waitlisted: number;
    toured: number;
  };
}

export function BulkMessageDialog({ hasBulkMessaging, counts }: BulkMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientType, setRecipientType] = useState<string>("all");

  const recipientOptions = [
    { value: "all", label: "All Contacts", count: counts.all },
    { value: "enrolled", label: "Enrolled Families", count: counts.enrolled },
    { value: "waitlisted", label: "Waitlisted Families", count: counts.waitlisted },
    { value: "toured", label: "Completed Tours", count: counts.toured },
  ];

  const selectedCount = recipientOptions.find((o) => o.value === recipientType)?.count || 0;

  const handleSubmit = () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      const result = await sendBulkMessage({
        subject: subject.trim(),
        content: content.trim(),
        recipientType: recipientType as "all" | "enrolled" | "waitlisted" | "toured",
      });

      if (result.success && result.data) {
        toast.success(`Message sent to ${result.data.sent} recipients`);
        setOpen(false);
        setSubject("");
        setContent("");
      } else {
        toast.error(result.error || "Failed to send messages");
      }
    });
  };

  if (!hasBulkMessaging) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Bulk Message
          </Button>
        </DialogTrigger>
        <DialogContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground text-center mb-4">
              Bulk messaging is available on Professional and Enterprise plans.
              Send announcements to all your enrolled families at once.
            </p>
            <Button asChild>
              <Link href="/portal/billing">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Bulk Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Bulk Message</DialogTitle>
          <DialogDescription>
            Send a message to multiple families at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipients">Recipients</Label>
            <Select value={recipientType} onValueChange={setRecipientType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recipientOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This message will be sent to {selectedCount} {selectedCount === 1 ? "family" : "families"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Holiday Schedule Update"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/2000
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || selectedCount === 0}>
            {isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send to {selectedCount} {selectedCount === 1 ? "Family" : "Families"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
