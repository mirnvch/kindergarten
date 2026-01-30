"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ==================== TYPES ====================

export type VerificationRequestWithDocs = {
  id: string;
  daycareId: string;
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  licenseNumber: string | null;
  licenseState: string | null;
  licenseExpiry: Date | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  documents: {
    id: string;
    type: string;
    name: string;
    url: string;
    size: number | null;
    mimeType: string | null;
    createdAt: Date;
  }[];
  daycare: {
    id: string;
    name: string;
    slug: string;
  };
};

// ==================== VALIDATION ====================

const submitVerificationSchema = z.object({
  daycareId: z.string().cuid(),
  licenseNumber: z.string().min(1, "License number is required"),
  licenseState: z.string().min(2, "License state is required"),
  licenseExpiry: z.string().datetime().optional(),
  documents: z.array(z.object({
    type: z.enum(["license", "insurance", "background_check", "other"]),
    name: z.string().min(1),
    url: z.string().url(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
  })).min(1, "At least one document is required"),
});

const reviewVerificationSchema = z.object({
  requestId: z.string().cuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// ==================== PORTAL ACTIONS ====================

/**
 * Submit a verification request for a daycare
 */
export async function submitVerificationRequest(
  input: z.infer<typeof submitVerificationSchema>
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const validated = submitVerificationSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { daycareId, licenseNumber, licenseState, licenseExpiry, documents } = validated.data;

  // Check if user is owner of this daycare
  const staff = await db.daycareStaff.findFirst({
    where: {
      daycareId,
      userId: session.user.id,
      role: "owner",
      isActive: true,
    },
  });

  if (!staff) {
    return { success: false, error: "You must be the owner of this daycare" };
  }

  // Check if there's already a pending request
  const existingRequest = await db.verificationRequest.findFirst({
    where: {
      daycareId,
      status: { in: ["PENDING", "IN_REVIEW"] },
    },
  });

  if (existingRequest) {
    return { success: false, error: "A verification request is already pending" };
  }

  // Create verification request with documents
  const request = await db.verificationRequest.create({
    data: {
      daycareId,
      licenseNumber,
      licenseState,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      documents: {
        create: documents.map(doc => ({
          type: doc.type,
          name: doc.name,
          url: doc.url,
          size: doc.size,
          mimeType: doc.mimeType,
        })),
      },
    },
    include: {
      documents: true,
    },
  });

  revalidatePath("/portal/verification");

  return { success: true, data: request };
}

/**
 * Get verification status for a daycare
 */
export async function getVerificationStatus(daycareId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if user has access to this daycare
  const staff = await db.daycareStaff.findFirst({
    where: {
      daycareId,
      userId: session.user.id,
      isActive: true,
    },
  });

  if (!staff) {
    return { success: false, error: "Access denied" };
  }

  const daycare = await db.daycare.findUnique({
    where: { id: daycareId },
    select: {
      id: true,
      name: true,
      isVerified: true,
    },
  });

  if (!daycare) {
    return { success: false, error: "Daycare not found" };
  }

  // Get latest verification request
  const latestRequest = await db.verificationRequest.findFirst({
    where: { daycareId },
    orderBy: { createdAt: "desc" },
    include: {
      documents: true,
    },
  });

  return {
    success: true,
    data: {
      isVerified: daycare.isVerified,
      latestRequest,
    },
  };
}

// ==================== ADMIN ACTIONS ====================

/**
 * Get all verification requests (admin only)
 */
export async function getVerificationRequests(options?: {
  status?: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = options?.status ? { status: options.status } : {};

  const [requests, total] = await Promise.all([
    db.verificationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        daycare: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
          },
        },
        documents: true,
      },
    }),
    db.verificationRequest.count({ where }),
  ]);

  return {
    success: true,
    data: {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
}

/**
 * Get a single verification request (admin only)
 */
export async function getVerificationRequest(requestId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const request = await db.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      daycare: {
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          isVerified: true,
        },
      },
      documents: true,
    },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  return { success: true, data: request };
}

/**
 * Start reviewing a verification request (admin only)
 */
export async function startVerificationReview(requestId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const request = await db.verificationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "PENDING") {
    return { success: false, error: "Request is not pending" };
  }

  const updated = await db.verificationRequest.update({
    where: { id: requestId },
    data: {
      status: "IN_REVIEW",
      reviewedBy: session.user.id,
    },
  });

  revalidatePath("/admin/verifications");

  return { success: true, data: updated };
}

/**
 * Review a verification request (admin only)
 */
export async function reviewVerificationRequest(
  input: z.infer<typeof reviewVerificationSchema>
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const validated = reviewVerificationSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const { requestId, status, reviewNotes, rejectionReason } = validated.data;

  const request = await db.verificationRequest.findUnique({
    where: { id: requestId },
    include: { daycare: true },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (!["PENDING", "IN_REVIEW"].includes(request.status)) {
    return { success: false, error: "Request has already been processed" };
  }

  if (status === "REJECTED" && !rejectionReason) {
    return { success: false, error: "Rejection reason is required" };
  }

  // Update request and daycare in transaction
  const result = await db.$transaction(async (tx) => {
    const updatedRequest = await tx.verificationRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedBy: session.user!.id,
        reviewedAt: new Date(),
        reviewNotes,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
    });

    // If approved, update daycare's isVerified status
    if (status === "APPROVED") {
      await tx.daycare.update({
        where: { id: request.daycareId },
        data: { isVerified: true },
      });
    }

    return updatedRequest;
  });

  revalidatePath("/admin/verifications");
  revalidatePath(`/admin/verifications/${requestId}`);

  return { success: true, data: result };
}

/**
 * Revoke verification (admin only)
 */
export async function revokeVerification(daycareId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (!reason || reason.trim().length < 10) {
    return { success: false, error: "Reason must be at least 10 characters" };
  }

  const daycare = await db.daycare.findUnique({
    where: { id: daycareId },
  });

  if (!daycare) {
    return { success: false, error: "Daycare not found" };
  }

  if (!daycare.isVerified) {
    return { success: false, error: "Daycare is not verified" };
  }

  // Create a revocation record and update daycare
  await db.$transaction(async (tx) => {
    // Update daycare
    await tx.daycare.update({
      where: { id: daycareId },
      data: { isVerified: false },
    });

    // Update the most recent approved verification request
    await tx.verificationRequest.updateMany({
      where: {
        daycareId,
        status: "APPROVED",
      },
      data: {
        status: "REJECTED",
        reviewedBy: session.user!.id,
        reviewedAt: new Date(),
        rejectionReason: `Verification revoked: ${reason}`,
      },
    });
  });

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/daycares");

  return { success: true };
}
