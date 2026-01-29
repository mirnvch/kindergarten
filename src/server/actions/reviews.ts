"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const reviewSchema = z.object({
  daycareId: z.string().min(1, "Daycare ID is required"),
  rating: z.number().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().max(2000).optional(),
  safetyRating: z.number().min(1).max(5).optional(),
  cleanlinessRating: z.number().min(1).max(5).optional(),
  staffRating: z.number().min(1).max(5).optional(),
  programRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export async function createReview(data: ReviewInput) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "You must be logged in to leave a review" };
    }

    const validated = reviewSchema.parse(data);

    // Check if daycare exists and is approved
    const daycare = await db.daycare.findUnique({
      where: { id: validated.daycareId },
    });

    if (!daycare || daycare.status !== "APPROVED") {
      return { success: false, error: "Daycare not found" };
    }

    // Check if user already reviewed this daycare
    const existingReview = await db.review.findUnique({
      where: {
        daycareId_userId: {
          daycareId: validated.daycareId,
          userId: session.user.id,
        },
      },
    });

    if (existingReview) {
      return { success: false, error: "You have already reviewed this daycare" };
    }

    // Check if auto-approve is enabled
    const autoApproveSetting = await db.platformSettings.findUnique({
      where: { key: "moderation" },
    });
    const moderation = autoApproveSetting?.value as { autoApproveReviews?: boolean } | null;
    const isApproved = moderation?.autoApproveReviews ?? false;

    await db.review.create({
      data: {
        daycareId: validated.daycareId,
        userId: session.user.id,
        rating: validated.rating,
        title: validated.title || null,
        content: validated.content || null,
        safetyRating: validated.safetyRating || null,
        cleanlinessRating: validated.cleanlinessRating || null,
        staffRating: validated.staffRating || null,
        programRating: validated.programRating || null,
        valueRating: validated.valueRating || null,
        isApproved,
      },
    });

    revalidatePath(`/daycare/${daycare.slug}`);
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
      include: { daycare: true },
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
        safetyRating: data.safetyRating,
        cleanlinessRating: data.cleanlinessRating,
        staffRating: data.staffRating,
        programRating: data.programRating,
        valueRating: data.valueRating,
      },
    });

    revalidatePath(`/daycare/${review.daycare.slug}`);
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
      include: { daycare: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.delete({
      where: { id: reviewId },
    });

    revalidatePath(`/daycare/${review.daycare.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: "Failed to delete review" };
  }
}

export async function getUserReviewForDaycare(daycareId: string) {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return db.review.findUnique({
    where: {
      daycareId_userId: {
        daycareId,
        userId: session.user.id,
      },
    },
  });
}

export async function canUserReview(daycareId: string) {
  const session = await auth();
  if (!session?.user) {
    return { canReview: false, reason: "not_logged_in" as const };
  }

  // Check if user is daycare owner/staff
  const isStaff = await db.daycareStaff.findFirst({
    where: { daycareId, userId: session.user.id },
  });

  if (isStaff) {
    return { canReview: false, reason: "is_staff" as const };
  }

  // Check if already reviewed
  const existingReview = await db.review.findUnique({
    where: {
      daycareId_userId: {
        daycareId,
        userId: session.user.id,
      },
    },
  });

  if (existingReview) {
    return { canReview: false, reason: "already_reviewed" as const, review: existingReview };
  }

  return { canReview: true, reason: null };
}

// Portal: Daycare owner can respond to reviews
export async function respondToReview(reviewId: string, response: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get review and verify ownership
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: { daycare: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Check if user is owner/manager of this daycare
    const isStaff = await db.daycareStaff.findFirst({
      where: {
        daycareId: review.daycareId,
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

    revalidatePath(`/daycare/${review.daycare.slug}`);
    revalidatePath("/portal/reviews");
    return { success: true };
  } catch (error) {
    console.error("Error responding to review:", error);
    return { success: false, error: "Failed to respond to review" };
  }
}
