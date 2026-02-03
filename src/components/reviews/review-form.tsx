"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createReview, type ReviewInput } from "@/server/actions/reviews";
import { toast } from "sonner";

interface ReviewFormProps {
  providerId: string;
  providerName: string;
  trigger?: React.ReactNode;
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-1">
      {label && <Label className="text-sm">{label}</Label>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-0.5 focus:outline-none focus:ring-2 focus:ring-primary rounded"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= (hovered || value)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({ providerId, providerName, trigger }: ReviewFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);
  const [formData, setFormData] = useState<ReviewInput>({
    providerId,
    rating: 0,
    title: "",
    content: "",
    communicationRating: undefined,
    waitTimeRating: undefined,
    staffRating: undefined,
    facilityRating: undefined,
    overallCareRating: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createReview(formData);
      if (result.success) {
        toast.success(result.message || "Review submitted!");
        setIsOpen(false);
        setFormData({
          providerId,
          rating: 0,
          title: "",
          content: "",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit review");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Star className="mr-2 h-4 w-4" />
            Write a Review
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Review {providerName}</DialogTitle>
            <DialogDescription>
              Share your experience to help other patients make informed decisions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <Label>Overall Rating *</Label>
              <StarRating
                value={formData.rating}
                onChange={(v) => setFormData((prev) => ({ ...prev, rating: v }))}
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="reviewTitle">Title (optional)</Label>
              <Input
                id="reviewTitle"
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Summarize your experience"
                maxLength={100}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="reviewContent">Your Review (optional)</Label>
              <Textarea
                id="reviewContent"
                value={formData.content || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Tell us about your experience with this provider..."
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {(formData.content || "").length}/2000
              </p>
            </div>

            {/* Detailed Ratings Toggle */}
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailedRatings(!showDetailedRatings)}
              >
                {showDetailedRatings ? "Hide" : "Add"} detailed ratings
              </Button>
            </div>

            {/* Detailed Ratings */}
            {showDetailedRatings && (
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/50">
                <StarRating
                  label="Communication"
                  value={formData.communicationRating || 0}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, communicationRating: v }))
                  }
                />
                <StarRating
                  label="Wait Time"
                  value={formData.waitTimeRating || 0}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, waitTimeRating: v }))
                  }
                />
                <StarRating
                  label="Staff"
                  value={formData.staffRating || 0}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, staffRating: v }))
                  }
                />
                <StarRating
                  label="Facility"
                  value={formData.facilityRating || 0}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, facilityRating: v }))
                  }
                />
                <StarRating
                  label="Overall Care"
                  value={formData.overallCareRating || 0}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, overallCareRating: v }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || formData.rating === 0}>
              {isLoading ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
