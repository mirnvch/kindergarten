"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { AppointmentStatus, AppointmentType, ProviderStatus } from "@prisma/client";
import { z } from "zod";
import {
  generateAvailableSlots,
  generateRecurringDates,
  generateSeriesId,
  getDefaultRecurrenceEndDate,
  type DayAvailability,
  type RecurrencePattern,
} from "@/lib/booking-utils";
import type { AppointmentWithRelations, AppointmentFull } from "@/types";
import type { ActionResult } from "@/types/action-result";

export type AppointmentFilter = "upcoming" | "past";

export async function getPatientAppointments(
  filter: AppointmentFilter = "upcoming"
): Promise<ActionResult<AppointmentWithRelations[]>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to view appointments" };
    }

    const now = new Date();

    const appointments = await db.appointment.findMany({
      where: {
        patientId: session.user.id,
        ...(filter === "upcoming"
          ? {
              scheduledAt: { gte: now },
              status: { in: ["PENDING", "CONFIRMED"] },
            }
          : {
              OR: [
                { scheduledAt: { lt: now } },
                { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
              ],
            }),
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            city: true,
            state: true,
            specialty: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
          },
        },
      },
      orderBy: {
        scheduledAt: filter === "upcoming" ? "asc" : "desc",
      },
    });

    return { success: true, data: appointments };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { success: false, error: "Failed to load appointments" };
  }
}

export async function cancelAppointment(id: string, reason?: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to cancel appointments" };
    }

    // Verify ownership and status
    const appointment = await db.appointment.findFirst({
      where: {
        id,
        patientId: session.user.id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        provider: { select: { slug: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found or cannot be cancelled" };
    }

    // Check cancellation policy (must be at least 24 hours before)
    const hoursUntilAppointment = (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilAppointment < 24) {
      return { success: false, error: "Cancellations must be made at least 24 hours in advance" };
    }

    await db.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason || "Cancelled by patient",
      },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return { success: false, error: "Failed to cancel appointment" };
  }
}

// ==================== CANCEL APPOINTMENT SERIES ====================

export async function cancelAppointmentSeries(
  seriesId: string,
  reason?: string
): Promise<ActionResult<{ cancelledCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to cancel appointments" };
    }

    // Verify ownership and get all appointments in series
    const appointments = await db.appointment.findMany({
      where: {
        seriesId,
        patientId: session.user.id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (appointments.length === 0) {
      return { success: false, error: "No appointments found in this series" };
    }

    // Check cancellation policy for all future appointments
    const now = Date.now();
    const futureAppointments = appointments.filter(
      (a) => a.scheduledAt.getTime() > now
    );

    for (const appointment of futureAppointments) {
      const hoursUntilAppointment = (appointment.scheduledAt.getTime() - now) / (1000 * 60 * 60);
      if (hoursUntilAppointment < 24) {
        return {
          success: false,
          error: `Cannot cancel appointment on ${appointment.scheduledAt.toLocaleDateString()} - less than 24 hours away`,
        };
      }
    }

    // Cancel all future appointments in the series
    await db.appointment.updateMany({
      where: {
        seriesId,
        patientId: session.user.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gt: new Date() },
      },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason || "Series cancelled by patient",
      },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard");

    return { success: true, data: { cancelledCount: futureAppointments.length } };
  } catch (error) {
    console.error("Error cancelling appointment series:", error);
    return { success: false, error: "Failed to cancel appointment series" };
  }
}

// ==================== GET SERIES APPOINTMENTS ====================

export async function getSeriesAppointments(seriesId: string): Promise<ActionResult<AppointmentWithRelations[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Please sign in to view appointments" };
    }

    const appointments = await db.appointment.findMany({
      where: {
        seriesId,
        OR: [
          { patientId: session.user.id },
          {
            provider: {
              staff: { some: { userId: session.user.id } },
            },
          },
        ],
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            city: true,
            state: true,
            specialty: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return { success: true, data: appointments };
  } catch (error) {
    console.error("Error fetching series appointments:", error);
    return { success: false, error: "Failed to load series appointments" };
  }
}

// ==================== RESCHEDULE APPOINTMENT ====================

const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  newScheduledAt: z.string().datetime("Invalid date/time"),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;

export async function rescheduleAppointment(input: RescheduleInput): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PATIENT") {
      return { success: false, error: "Please sign in to reschedule appointments" };
    }

    const validated = rescheduleSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid data" };
    }

    // Verify ownership and status
    const appointment = await db.appointment.findFirst({
      where: {
        id: validated.data.appointmentId,
        patientId: session.user.id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        provider: { select: { id: true, slug: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found or cannot be rescheduled" };
    }

    const newScheduledAt = new Date(validated.data.newScheduledAt);

    // Verify new slot is at least 24 hours ahead
    const minTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (newScheduledAt < minTime) {
      return { success: false, error: "Please select a time at least 24 hours in advance" };
    }

    // Check for conflicts at new time
    const conflictingAppointment = await db.appointment.findFirst({
      where: {
        providerId: appointment.providerId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        id: { not: appointment.id },
        scheduledAt: {
          gte: new Date(newScheduledAt.getTime() - 30 * 60 * 1000),
          lt: new Date(newScheduledAt.getTime() + 30 * 60 * 1000),
        },
      },
    });

    if (conflictingAppointment) {
      return { success: false, error: "This time slot is no longer available" };
    }

    // Update appointment with new time
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAt: newScheduledAt,
        status: AppointmentStatus.PENDING, // Reset to pending for reconfirmation
        notes: appointment.notes
          ? `${appointment.notes}\n\nRescheduled from ${appointment.scheduledAt.toISOString()}`
          : `Rescheduled from ${appointment.scheduledAt.toISOString()}`,
      },
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard");
    revalidatePath(`/provider/${appointment.provider.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    return { success: false, error: "Failed to reschedule appointment" };
  }
}

// ==================== SLOT AVAILABILITY ====================

export async function getAvailableSlots(
  providerId: string,
  startDate?: Date,
  endDate?: Date,
  isTelehealth?: boolean
): Promise<ActionResult<DayAvailability[]>> {
  try {
    const provider = await db.provider.findUnique({
      where: { id: providerId, status: ProviderStatus.APPROVED, deletedAt: null },
      select: {
        openingTime: true,
        closingTime: true,
        operatingDays: true,
        offersTelehealth: true,
      },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    // If telehealth requested but provider doesn't offer it
    if (isTelehealth && !provider.offersTelehealth) {
      return { success: false, error: "This provider does not offer telemedicine appointments" };
    }

    // Get existing appointments for the time period
    const now = new Date();
    const start = startDate || now;
    const end = endDate || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const existingAppointments = await db.appointment.findMany({
      where: {
        providerId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        scheduledAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        scheduledAt: true,
        duration: true,
        status: true,
      },
    });

    const daysAhead = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    const slots = generateAvailableSlots(
      {
        openingTime: provider.openingTime,
        closingTime: provider.closingTime,
        operatingDays: provider.operatingDays,
      },
      existingAppointments.map((a) => ({
        scheduledAt: a.scheduledAt,
        duration: a.duration,
        status: a.status,
      })),
      daysAhead,
      30 // 30-minute default slots
    );

    return { success: true, data: slots };
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return { success: false, error: "Failed to load available time slots" };
  }
}

// ==================== APPOINTMENT QUERIES ====================

export async function getAppointmentById(id: string): Promise<ActionResult<AppointmentFull | null>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Please sign in to view appointment details" };
    }

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true,
            specialty: true,
            offersTelehealth: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            relationship: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            isTelehealth: true,
          },
        },
      },
    });

    if (!appointment) {
      return { success: true, data: null };
    }

    // Verify user has access to this appointment
    const isPatient = appointment.patientId === session.user.id;
    const isProviderStaff =
      session.user.role === "PROVIDER" &&
      (await db.providerStaff.findFirst({
        where: { providerId: appointment.providerId, userId: session.user.id },
      }));

    if (!isPatient && !isProviderStaff && session.user.role !== "ADMIN") {
      return { success: false, error: "You don't have access to this appointment" };
    }

    return { success: true, data: appointment };
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return { success: false, error: "Failed to load appointment details" };
  }
}

// ==================== CREATE APPOINTMENT ====================

const appointmentSchema = z.object({
  providerId: z.string().min(1, "Provider is required"),
  familyMemberId: z.string().optional(),
  serviceId: z.string().optional(),
  scheduledAt: z.string().datetime("Invalid date/time"),
  // Appointment type
  isTelemedicine: z.boolean().optional().default(false),
  // Reason for visit
  reasonForVisit: z.string().optional(),
  symptoms: z.string().optional(),
  isNewPatient: z.boolean().optional().default(true),
  notes: z.string().optional(),
  // Recurrence options
  recurrence: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional().default("NONE"),
  recurrenceEndDate: z.string().datetime().optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export async function createAppointment(input: AppointmentInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  // Rate limit: 10 appointments per minute
  const rateLimitResult = await rateLimit(session.user.id, "appointment");
  if (!rateLimitResult.success) {
    throw new Error("Too many appointment requests. Please try again later.");
  }

  const validated = appointmentSchema.parse(input);

  // Verify family member belongs to patient (if specified)
  if (validated.familyMemberId) {
    const familyMember = await db.familyMember.findFirst({
      where: {
        id: validated.familyMemberId,
        patientId: session.user.id,
      },
    });

    if (!familyMember) {
      throw new Error("Family member not found");
    }
  }

  // Verify provider is approved
  const provider = await db.provider.findUnique({
    where: {
      id: validated.providerId,
      status: ProviderStatus.APPROVED,
      deletedAt: null,
    },
  });

  if (!provider) {
    throw new Error("Provider not found or not available");
  }

  // Check if telemedicine requested but provider doesn't offer it
  if (validated.isTelemedicine && !provider.offersTelehealth) {
    throw new Error("This provider does not offer telemedicine appointments");
  }

  // Verify service if specified
  let duration = 30; // default duration
  if (validated.serviceId) {
    const service = await db.service.findFirst({
      where: {
        id: validated.serviceId,
        providerId: validated.providerId,
        isActive: true,
      },
    });

    if (!service) {
      throw new Error("Service not found");
    }
    duration = service.duration;

    // If service is telehealth-only, enforce telemedicine
    if (service.isTelehealth && !validated.isTelemedicine) {
      throw new Error("This service is only available via telemedicine");
    }
  }

  const scheduledAt = new Date(validated.scheduledAt);

  // Verify slot is at least 24 hours ahead
  const minTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (scheduledAt < minTime) {
    throw new Error("Please select a time at least 24 hours in advance");
  }

  // Handle recurring appointments
  const recurrencePattern = (validated.recurrence || "NONE") as RecurrencePattern;
  const isRecurring = recurrencePattern !== "NONE";

  let appointmentDates: Date[] = [scheduledAt];
  let seriesId: string | null = null;

  if (isRecurring) {
    const endDate = validated.recurrenceEndDate
      ? new Date(validated.recurrenceEndDate)
      : getDefaultRecurrenceEndDate(scheduledAt);

    appointmentDates = generateRecurringDates({
      pattern: recurrencePattern,
      startDate: scheduledAt,
      endDate,
    });

    seriesId = generateSeriesId();
  }

  // Check for conflicts with ALL recurring dates
  for (const date of appointmentDates) {
    const conflictingAppointment = await db.appointment.findFirst({
      where: {
        providerId: validated.providerId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        scheduledAt: {
          gte: new Date(date.getTime() - duration * 60 * 1000),
          lt: new Date(date.getTime() + duration * 60 * 1000),
        },
      },
    });

    if (conflictingAppointment) {
      throw new Error(
        isRecurring
          ? `Time slot on ${date.toLocaleDateString()} is not available. Please choose a different time.`
          : "This time slot is no longer available"
      );
    }
  }

  // Determine appointment type
  const appointmentType = validated.isTelemedicine
    ? AppointmentType.TELEMEDICINE
    : AppointmentType.IN_PERSON;

  // Create all appointments (single or recurring series)
  const appointments = await db.$transaction(
    appointmentDates.map((date) =>
      db.appointment.create({
        data: {
          patientId: session.user.id,
          providerId: validated.providerId,
          familyMemberId: validated.familyMemberId || null,
          serviceId: validated.serviceId || null,
          type: appointmentType,
          status: AppointmentStatus.PENDING,
          scheduledAt: date,
          duration,
          isTelemedicine: validated.isTelemedicine,
          reasonForVisit: validated.reasonForVisit || null,
          symptoms: validated.symptoms || null,
          isNewPatient: validated.isNewPatient,
          notes: validated.notes || null,
          recurrence: recurrencePattern,
          recurrenceEndDate: isRecurring ? appointmentDates[appointmentDates.length - 1] : null,
          seriesId,
        },
      })
    )
  );

  const firstAppointment = appointments[0];

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
  revalidatePath(`/provider/${provider.slug}`);

  redirect(`/appointment/${firstAppointment.id}/confirmation${isRecurring ? `?series=${appointments.length}` : ""}`);
}
