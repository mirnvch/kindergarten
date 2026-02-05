/**
 * Appointment Repository — Data access layer for Appointment model.
 *
 * Handles all database operations for appointments/bookings.
 * Use BookingService for business logic that builds on these operations.
 */

import { db } from "@/lib/db";
import { type Appointment, type Prisma, AppointmentStatus, AppointmentType } from "@prisma/client";
import { BaseRepository } from "./base.repository";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AppointmentCreateInput = Prisma.AppointmentCreateInput;
export type AppointmentUpdateInput = Prisma.AppointmentUpdateInput;
export type AppointmentWhereInput = Prisma.AppointmentWhereInput;

/**
 * Appointment with related data for display.
 */
export interface AppointmentWithRelations extends Appointment {
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  provider?: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    city: string | null;
  } | null;
  familyMember?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
  } | null;
}

/**
 * Time slot for availability check.
 */
export interface TimeSlot {
  scheduledAt: Date | null;
  duration: number;
  status: AppointmentStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class AppointmentRepository extends BaseRepository<
  Appointment,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  AppointmentWhereInput
> {
  constructor() {
    super(db.appointment);
  }

  // ─── Find Operations ──────────────────────────────────────────────────────

  /**
   * Find appointment by ID with relations.
   */
  async findByIdWithRelations(id: string): Promise<AppointmentWithRelations | null> {
    return db.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            city: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });
  }

  /**
   * Find appointments for a patient.
   */
  async findByPatient(
    patientId: string,
    options?: {
      status?: AppointmentStatus[];
      upcoming?: boolean;
      past?: boolean;
      limit?: number;
    }
  ): Promise<AppointmentWithRelations[]> {
    const where: AppointmentWhereInput = { patientId };

    if (options?.status) {
      where.status = { in: options.status };
    }

    if (options?.upcoming) {
      where.scheduledAt = { gte: new Date() };
    } else if (options?.past) {
      where.scheduledAt = { lt: new Date() };
    }

    return db.appointment.findMany({
      where,
      take: options?.limit,
      orderBy: { scheduledAt: options?.past ? "desc" : "asc" },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            city: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });
  }

  /**
   * Find appointments for a provider.
   */
  async findByProvider(
    providerId: string,
    options?: {
      status?: AppointmentStatus[];
      startDate?: Date;
      endDate?: Date;
      type?: AppointmentType;
    }
  ): Promise<AppointmentWithRelations[]> {
    const where: AppointmentWhereInput = { providerId };

    if (options?.status) {
      where.status = { in: options.status };
    }

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.scheduledAt = {};
      if (options.startDate) where.scheduledAt.gte = options.startDate;
      if (options.endDate) where.scheduledAt.lte = options.endDate;
    }

    return db.appointment.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });
  }

  /**
   * Find appointments in a series.
   */
  async findBySeries(seriesId: string, patientId?: string): Promise<Appointment[]> {
    const where: AppointmentWhereInput = { seriesId };

    if (patientId) {
      where.patientId = patientId;
    }

    return db.appointment.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
    });
  }

  /**
   * Find appointment for ownership check.
   */
  async findForOwnershipCheck(
    id: string,
    patientId: string,
    statuses?: AppointmentStatus[]
  ): Promise<Appointment | null> {
    return db.appointment.findFirst({
      where: {
        id,
        patientId,
        ...(statuses && { status: { in: statuses } }),
      },
    });
  }

  // ─── Availability & Conflicts ─────────────────────────────────────────────

  /**
   * Find existing bookings in a time range for conflict checking.
   */
  async findInTimeRange(
    providerId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<TimeSlot[]> {
    const where: AppointmentWhereInput = {
      providerId,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      scheduledAt: { gte: startTime, lt: endTime },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return db.appointment.findMany({
      where,
      select: {
        scheduledAt: true,
        duration: true,
        status: true,
      },
    });
  }

  /**
   * Check if a time slot has a conflict.
   */
  async hasConflict(
    providerId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeId?: string
  ): Promise<boolean> {
    const conflictWindow = durationMinutes * 60 * 1000;

    const count = await db.appointment.count({
      where: {
        providerId,
        type: AppointmentType.IN_PERSON,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        ...(excludeId && { id: { not: excludeId } }),
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - conflictWindow),
          lt: new Date(scheduledAt.getTime() + conflictWindow),
        },
      },
    });

    return count > 0;
  }

  // ─── Status Updates ───────────────────────────────────────────────────────

  /**
   * Cancel an appointment.
   */
  async cancel(id: string, reason?: string): Promise<Appointment> {
    return db.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason ?? "Cancelled",
      },
    });
  }

  /**
   * Cancel multiple appointments (e.g., a series).
   */
  async cancelMany(where: AppointmentWhereInput, reason?: string): Promise<{ count: number }> {
    return db.appointment.updateMany({
      where,
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason ?? "Cancelled",
      },
    });
  }

  /**
   * Confirm an appointment.
   */
  async confirm(id: string): Promise<Appointment> {
    return db.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });
  }

  /**
   * Mark appointment as completed.
   */
  async complete(id: string): Promise<Appointment> {
    return db.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
      },
    });
  }

  /**
   * Mark appointment as no-show.
   */
  async markNoShow(id: string): Promise<Appointment> {
    return db.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.NO_SHOW,
      },
    });
  }

  /**
   * Reschedule an appointment.
   */
  async reschedule(id: string, newScheduledAt: Date, note?: string): Promise<Appointment> {
    const current = await this.findById(id);

    return db.appointment.update({
      where: { id },
      data: {
        scheduledAt: newScheduledAt,
        status: AppointmentStatus.PENDING,
        notes: note
          ? `${current?.notes ?? ""}\n\nRescheduled: ${note}`.trim()
          : current?.notes
            ? `${current.notes}\n\nRescheduled from ${current.scheduledAt?.toISOString()}`
            : `Rescheduled from ${current?.scheduledAt?.toISOString()}`,
      },
    });
  }

  // ─── Bulk Operations ──────────────────────────────────────────────────────

  /**
   * Create multiple appointments and return them (for recurring bookings).
   * Unlike base createMany which returns count, this returns the created records.
   */
  async createManyAndReturn(data: Prisma.AppointmentCreateManyInput[]): Promise<Appointment[]> {
    // Use transaction to create and return all appointments
    return db.$transaction(
      data.map((appointment) =>
        db.appointment.create({
          data: {
            patient: { connect: { id: appointment.patientId } },
            provider: { connect: { id: appointment.providerId } },
            ...(appointment.familyMemberId && {
              familyMember: { connect: { id: appointment.familyMemberId } },
            }),
            ...(appointment.serviceId && {
              service: { connect: { id: appointment.serviceId } },
            }),
            type: appointment.type,
            status: appointment.status,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            notes: appointment.notes,
            recurrence: appointment.recurrence,
            recurrenceEndDate: appointment.recurrenceEndDate,
            seriesId: appointment.seriesId,
            isTelemedicine: appointment.isTelemedicine,
          },
        })
      )
    );
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  /**
   * Get appointment statistics for a provider.
   */
  async getProviderStatistics(
    providerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byStatus: Record<AppointmentStatus, number>;
    byType: Record<AppointmentType, number>;
  }> {
    const where: AppointmentWhereInput = { providerId };

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = startDate;
      if (endDate) where.scheduledAt.lte = endDate;
    }

    const [total, byStatus, byType] = await Promise.all([
      this.count(where),
      db.appointment.groupBy({
        by: ["status"],
        _count: { id: true },
        where,
      }),
      db.appointment.groupBy({
        by: ["type"],
        _count: { id: true },
        where,
      }),
    ]);

    const statusCount = byStatus.reduce(
      (acc, { status, _count }) => {
        acc[status] = _count.id;
        return acc;
      },
      {} as Record<AppointmentStatus, number>
    );

    const typeCount = byType.reduce(
      (acc, { type, _count }) => {
        acc[type] = _count.id;
        return acc;
      },
      {} as Record<AppointmentType, number>
    );

    return {
      total,
      byStatus: statusCount,
      byType: typeCount,
    };
  }

  /**
   * Find appointments that need reminders (24 hours before).
   */
  async findNeedingReminders(): Promise<AppointmentWithRelations[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return db.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: {
          gte: now,
          lte: tomorrow,
        },
        reminderSentAt: null,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            city: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });
  }

  /**
   * Mark reminder as sent.
   */
  async markReminderSent(id: string): Promise<void> {
    await db.appointment.update({
      where: { id },
      data: { reminderSentAt: new Date() },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentRepository = new AppointmentRepository();
