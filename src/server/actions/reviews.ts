"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const reviewSchema = z.object({
  providerId: z.string().min(1, "Provider ID is required"),
  rating: z.number().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().max(2000).optional(),
  // Medical-specific detailed ratings
  communicationRating: z.number().min(1).max(5).optional(),
  waitTimeRating: z.number().min(1).max(5).optional(),
  staffRating: z.number().min(1).max(5).optional(),
  facilityRating: z.number().min(1).max(5).optional(),
  overallCareRating: z.number().min(1).max(5).optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export async function createReview(data: ReviewInput) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "You must be logged in to leave a review" };
    }

    // Rate limit: 5 reviews per hour
    const rateLimitResult = await rateLimit(session.user.id, "review");
    if (!rateLimitResult.success) {
      return { success: false, error: "Too many reviews. Please try again later." };
    }

    const validated = reviewSchema.parse(data);

    // Check if provider exists and is approved
    const provider = await db.provider.findUnique({
      where: { id: validated.providerId },
    });

    if (!provider || provider.status !== "APPROVED") {
      return { success: false, error: "Provider not found" };
    }

    // Check if user already reviewed this provider
    const existingReview = await db.review.findUnique({
      where: {
        providerId_userId: {
          providerId: validated.providerId,
          userId: session.user.id,
        },
      },
    });

    if (existingReview) {
      return { success: false, error: "You have already reviewed this provider" };
    }

    // Check if auto-approve is enabled
    const autoApproveSetting = await db.platformSettings.findUnique({
      where: { key: "moderation" },
    });
    const moderation = autoApproveSetting?.value as { autoApproveReviews?: boolean } | null;
    const isApproved = moderation?.autoApproveReviews ?? false;

    await db.review.create({
      data: {
        providerId: validated.providerId,
        userId: session.user.id,
        rating: validated.rating,
        title: validated.title || null,
        content: validated.content || null,
        communicationRating: validated.communicationRating || null,
        waitTimeRating: validated.waitTimeRating || null,
        staffRating: validated.staffRating || null,
        facilityRating: validated.facilityRating || null,
        overallCareRating: validated.overallCareRating || null,
        isApproved,
      },
    });

    revalidatePath(`/provider/${provider.slug}`);
    return {
      success: true,
      message: isApproved
        ? "Review submitted successfully!"
        : "Review submitted and pending approval.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}

export async function updateReview(reviewId: string, data: Partial<ReviewInput>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify review belongs to user
    const review = await db.review.findFirst({
      where: { id: reviewId, userId: session.user.id },
      include: { provider: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.update({
      where: { id: reviewId },
      data: {
        rating: data.rating,
        title: data.title,
        content: data.content,
        communicationRating: data.communicationRating,
        waitTimeRating: data.waitTimeRating,
        staffRating: data.staffRating,
        facilityRating: data.facilityRating,
        overallCareRating: data.overallCareRating,
      },
    });

    revalidatePath(`/provider/${review.provider.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating review:", error);
    return { success: false, error: "Failed to update review" };
  }
}

export async function deleteReview(reviewId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify review belongs to user
    const review = await db.review.findFirst({
      where: { id: reviewId, userId: session.user.id },
      include: { provider: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.delete({
      where: { id: reviewId },
    });

    revalidatePath(`/provider/${review.provider.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: "Failed to delete review" };
  }
}

export async function getUserReviewForProvider(providerId: string) {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return db.review.findUnique({
    where: {
      providerId_userId: {
        providerId,
        userId: session.user.id,
      },
    },
  });
}

export async function canUserReview(providerId: string) {
  const session = await auth();
  if (!session?.user) {
    return { canReview: false, reason: "not_logged_in" as const };
  }

  // Check if user is provider owner/staff
  const isStaff = await db.providerStaff.findFirst({
    where: { providerId, userId: session.user.id },
  });

  if (isStaff) {
    return { canReview: false, reason: "is_staff" as const };
  }

  // Check if already reviewed
  const existingReview = await db.review.findUnique({
    where: {
      providerId_userId: {
        providerId,
        userId: session.user.id,
      },
    },
  });

  if (existingReview) {
    return { canReview: false, reason: "already_reviewed" as const, review: existingReview };
  }

  return { canReview: true, reason: null };
}

// Portal: Provider owner can respond to reviews
export async function respondToReview(reviewId: string, response: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get review and verify ownership
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: { provider: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Check if user is owner/manager of this provider
    const isStaff = await db.providerStaff.findFirst({
      where: {
        providerId: review.providerId,
        userId: session.user.id,
        role: { in: ["owner", "manager"] },
      },
    });

    if (!isStaff) {
      return { success: false, error: "You don't have permission to respond to this review" };
    }

    await db.review.update({
      where: { id: reviewId },
      data: {
        response: response.trim() || null,
        respondedAt: response.trim() ? new Date() : null,
      },
    });

    revalidatePath(`/provider/${review.provider.slug}`);
    revalidatePath("/portal/reviews");
    return { success: true };
  } catch (error) {
    console.error("Error responding to review:", error);
    return { success: false, error: "Failed to respond to review" };
  }
}
