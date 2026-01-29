"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Edit2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { respondToReview } from "@/server/actions/reviews";
import { toast } from "sonner";

interface ReviewResponseFormProps {
  reviewId: string;
  existingResponse: string | null;
  respondedAt: Date | null;
}

export function ReviewResponseForm({
  reviewId,
  existingResponse,
  respondedAt,
}: ReviewResponseFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!existingResponse);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(existingResponse || "");

  const handleSubmit = async () => {
    if (!response.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setIsLoading(true);
    try {
      const result = await respondToReview(reviewId, response);
      if (result.success) {
        toast.success("Response saved");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save response");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (existingResponse && !isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Responded</span>
            {respondedAt && (
              <span className="text-muted-foreground">
                on {new Date(respondedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
        <p className="text-sm bg-muted/50 p-3 rounded-lg">{existingResponse}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {existingResponse ? "Edit your response" : "Write a response"}
      </div>
      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Thank you for your feedback..."
        rows={3}
      />
      <div className="flex gap-2 justify-end">
        {existingResponse && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResponse(existingResponse);
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
          <Send className="h-4 w-4 mr-1" />
          {isLoading ? "Saving..." : "Send Response"}
        </Button>
      </div>
    </div>
  );
}
