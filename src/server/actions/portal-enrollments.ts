"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type PortalEnrollmentFilter = "pending" | "active" | "completed" | "cancelled";

export interface PortalEnrollment {
  id: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  schedule: string;
  monthlyRate: number;
  notes: string | null;
  createdAt: Date;
  child: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  };
}

async function getOwnerDaycareId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.role !== "DAYCARE_OWNER" && session.user.role !== "DAYCARE_STAFF") {
    return null;
  }

  const staff = await db.providerStaff.findFirst({
    where: { userId: session.user.id },
    select: { providerId: true },
  });

  return staff?.providerId || null;
}

export async function getPortalEnrollments(
  filter: PortalEnrollmentFilter = "pending"
): Promise<PortalEnrollment[]> {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const enrollments = await db.appointment.findMany({
    where: {
      providerId,
      status: filter,
    },
    include: {
      child: {
        include: {
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [
      { startDate: filter === "completed" || filter === "cancelled" ? "desc" : "asc" },
      { createdAt: "desc" },
    ],
  });

  return enrollments.map((e) => ({
    id: e.id,
    startDate: e.startDate,
    endDate: e.endDate,
    status: e.status,
    schedule: e.schedule,
    monthlyRate: Number(e.monthlyRate),
    notes: e.notes,
    createdAt: e.createdAt,
    child: {
      id: e.child.id,
      firstName: e.child.firstName,
      lastName: e.child.lastName,
      dateOfBirth: e.child.dateOfBirth,
      parent: e.child.parent,
    },
  }));
}

export async function getPortalEnrollmentStats() {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const [pending, active, completed, cancelled] = await Promise.all([
    db.appointment.count({
      where: { providerId, status: "pending" },
    }),
    db.appointment.count({
      where: { providerId, status: "active" },
    }),
    db.appointment.count({
      where: { providerId, status: "completed" },
    }),
    db.appointment.count({
      where: { providerId, status: "cancelled" },
    }),
  ]);

  return { pending, active, completed, cancelled };
}

export async function approveEnrollment(enrollmentId: string) {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const enrollment = await db.appointment.findFirst({
    where: {
      id: enrollmentId,
      providerId,
      status: "pending",
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found or already processed");
  }

  await db.appointment.update({
    where: { id: enrollmentId },
    data: { status: "active" },
  });

  revalidatePath("/portal/enrollments");
  revalidatePath("/portal");
}

export async function declineEnrollment(enrollmentId: string, reason?: string) {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const enrollment = await db.appointment.findFirst({
    where: {
      id: enrollmentId,
      providerId,
      status: { in: ["pending", "active"] },
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found or already processed");
  }

  await db.appointment.update({
    where: { id: enrollmentId },
    data: {
      status: "cancelled",
      notes: reason ? `${enrollment.notes || ""}\n\nCancellation reason: ${reason}`.trim() : enrollment.notes,
    },
  });

  revalidatePath("/portal/enrollments");
  revalidatePath("/portal");
}

export async function completeEnrollment(enrollmentId: string) {
  const providerId = await getOwnerDaycareId();
  if (!providerId) {
    throw new Error("Unauthorized");
  }

  const enrollment = await db.appointment.findFirst({
    where: {
      id: enrollmentId,
      providerId,
      status: "active",
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found or cannot be completed");
  }

  await db.appointment.update({
    where: { id: enrollmentId },
    data: {
      status: "completed",
      endDate: new Date(),
    },
  });

  revalidatePath("/portal/enrollments");
  revalidatePath("/portal");
}
