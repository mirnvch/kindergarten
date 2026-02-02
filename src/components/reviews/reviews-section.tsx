"use client";

import { Star, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "./review-form";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  response: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

interface ReviewsSectionProps {
  providerId?: string;
  providerName?: string;
  providerSlug?: string;
  daycareId?: string;  // Legacy alias
  daycareName?: string;  // Legacy alias
  daycareSlug?: string;  // Legacy alias
  reviews: Review[];
  reviewCount: number;
  avgRating: number;
  canReview: boolean;
  canReviewReason: "not_logged_in" | "is_staff" | "already_reviewed" | null;
}

export function ReviewsSection({
  providerId,
  providerName,
  providerSlug,
  daycareId,
  daycareName,
  daycareSlug,
  reviews,
  reviewCount,
  avgRating,
  canReview,
  canReviewReason,
}: ReviewsSectionProps) {
  // Support both new and legacy prop names
  const entityId = providerId || daycareId || "";
  const entityName = providerName || daycareName || "";
  const entitySlug = providerSlug || daycareSlug || "";
  return (
    <div className="space-y-6">
      {/* Header with stats and write button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {avgRating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                <span className="ml-1 text-2xl font-bold">{avgRating.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>

        {canReview ? (
          <ReviewForm daycareId={entityId} daycareName={entityName} />
        ) : canReviewReason === "not_logged_in" ? (
          <Button asChild>
            <Link href={`/login?callbackUrl=/provider/${entitySlug}`}>
              <Star className="mr-2 h-4 w-4" />
              Login to Review
            </Link>
          </Button>
        ) : canReviewReason === "already_reviewed" ? (
          <Button variant="outline" disabled>
            You&apos;ve already reviewed
          </Button>
        ) : null}
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No reviews yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id}>
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(review.user.firstName, review.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {review.user.firstName} {review.user.lastName.charAt(0)}.
                    </span>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <h4 className="font-medium mt-1">{review.title}</h4>
                  )}
                  {review.content && (
                    <p className="text-muted-foreground mt-1">{review.content}</p>
                  )}

                  {/* Daycare response */}
                  {review.response && (
                    <div className="mt-4 ml-4 pl-4 border-l-2 border-primary/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">Response from {entityName}</span>
                        {review.respondedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.respondedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{review.response}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator className="mt-6" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
