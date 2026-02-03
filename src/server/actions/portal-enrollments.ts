"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppointmentStatus } from "@prisma/client";

// Map filter to AppointmentStatus
const filterToStatus: Record<string, AppointmentStatus> = {
  pending: AppointmentStatus.PENDING,
  active: AppointmentStatus.CONFIRMED,
  completed: AppointmentStatus.COMPLETED,
  cancelled: AppointmentStatus.CANCELLED,
};

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

  if (session.user.role !== "PROVIDER" && session.user.role !== "CLINIC_STAFF") {
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
      status: filterToStatus[filter] || AppointmentStatus.PENDING,
    },
    include: {
      familyMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
        },
      },
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [
      { scheduledAt: filter === "completed" || filter === "cancelled" ? "desc" : "asc" },
      { createdAt: "desc" },
    ],
  });

  // Map Appointment model to legacy PortalEnrollment interface
  // TODO: Refactor for medical platform (enrollments not applicable)
  return enrollments.map((e) => ({
    id: e.id,
    startDate: e.scheduledAt, // Use scheduledAt as startDate
    endDate: null, // Not applicable
    status: e.status,
    schedule: "appointment", // Placeholder
    monthlyRate: 0, // Not applicable for appointments
    notes: e.notes,
    createdAt: e.createdAt,
    child: e.familyMember ? {
      id: e.familyMember.id,
      firstName: e.familyMember.firstName,
      lastName: e.familyMember.lastName,
      dateOfBirth: e.familyMember.dateOfBirth,
      parent: e.patient,
    } : {
      // If no familyMember, use patient info
      id: e.patient.id,
      firstName: e.patient.firstName,
      lastName: e.patient.lastName,
      dateOfBirth: new Date(), // Placeholder
      parent: e.patient,
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
      where: { providerId, status: AppointmentStatus.PENDING },
    }),
    db.appointment.count({
      where: { providerId, status: AppointmentStatus.CONFIRMED },
    }),
    db.appointment.count({
      where: { providerId, status: AppointmentStatus.COMPLETED },
    }),
    db.appointment.count({
      where: { providerId, status: AppointmentStatus.CANCELLED },
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
      status: AppointmentStatus.PENDING,
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found or already processed");
  }

  await db.appointment.update({
    where: { id: enrollmentId },
    data: { status: AppointmentStatus.CONFIRMED },
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
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found or already processed");
  }

  await db.appointment.update({
    where: { id: enrollmentId },
    data: {
      status: AppointmentStatus.CANCELLED,
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
      status: AppointmentStatus.CONFIRMED,
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found or cannot be completed");
  }

  await db.appointment.update({
    where: { id: enrollmentId },
    data: {
      status: AppointmentStatus.COMPLETED,
    },
  });

  revalidatePath("/portal/enrollments");
  revalidatePath("/portal");
}
