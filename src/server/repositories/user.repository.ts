/**
 * User Repository — Data access layer for User model.
 *
 * Handles all database operations for users.
 * Use UserService for business logic that builds on these operations.
 */

import { db } from "@/lib/db";
import { type User, type Prisma, UserRole } from "@prisma/client";
import { BaseRepository } from "./base.repository";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;
export type UserWhereInput = Prisma.UserWhereInput;
export type UserSelect = Prisma.UserSelect;
export type UserInclude = Prisma.UserInclude;

/**
 * User data without sensitive fields.
 */
export type SafeUser = Omit<User, "passwordHash">;

/**
 * Minimal user data for lists.
 */
export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class UserRepository extends BaseRepository<
  User,
  UserCreateInput,
  UserUpdateInput,
  UserWhereInput
> {
  constructor() {
    super(db.user);
  }

  // ─── Find Operations ──────────────────────────────────────────────────────

  /**
   * Find user by email (case-insensitive).
   */
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Find user by email without password.
   */
  async findByEmailSafe(email: string): Promise<SafeUser | null> {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Find user by ID without password.
   */
  async findByIdSafe(id: string): Promise<SafeUser | null> {
    const user = await this.findById(id);

    if (!user) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Find users by role.
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return db.user.findMany({
      where: { role },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find users with pagination and filters.
   */
  async findUsersForAdmin(
    page: number,
    pageSize: number,
    filters?: {
      role?: UserRole;
      search?: string;
      status?: "active" | "deleted" | "all";
    }
  ) {
    const where: UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.status === "deleted") {
      where.deletedAt = { not: null };
    } else if (filters?.status !== "all") {
      where.deletedAt = null;
    }

    return this.findPaginated(where, page, pageSize, {
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        emailVerified: true,
        deletedAt: true,
      },
    });
  }

  // ─── Existence Checks ─────────────────────────────────────────────────────

  /**
   * Check if email is already taken.
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const where: UserWhereInput = {
      email: email.toLowerCase().trim(),
    };

    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    return this.exists(where);
  }

  // ─── Update Operations ────────────────────────────────────────────────────

  /**
   * Update user profile.
   */
  async updateProfile(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
    }
  ): Promise<SafeUser> {
    const user = await db.user.update({
      where: { id },
      data,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Update user password.
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await db.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });
  }

  /**
   * Update user role.
   */
  async updateRole(id: string, role: UserRole): Promise<User> {
    return db.user.update({
      where: { id },
      data: { role },
    });
  }

  /**
   * Verify user email.
   */
  async verifyEmail(id: string): Promise<void> {
    await db.user.update({
      where: { id },
      data: { emailVerified: new Date() },
    });
  }

  // ─── Soft Delete Operations ───────────────────────────────────────────────

  /**
   * Soft delete user (schedule for deletion).
   */
  async scheduleForDeletion(id: string, deleteAfterDays: number = 14): Promise<User> {
    const deleteAt = new Date();
    deleteAt.setDate(deleteAt.getDate() + deleteAfterDays);

    return db.user.update({
      where: { id },
      data: {
        deletionScheduledAt: deleteAt,
      },
    });
  }

  /**
   * Cancel scheduled deletion.
   */
  async cancelDeletion(id: string): Promise<User> {
    return db.user.update({
      where: { id },
      data: {
        deletionScheduledAt: null,
      },
    });
  }

  /**
   * Find users scheduled for deletion.
   */
  async findScheduledForDeletion(): Promise<User[]> {
    return db.user.findMany({
      where: {
        deletionScheduledAt: { lte: new Date() },
        deletedAt: null,
      },
    });
  }

  /**
   * Anonymize user data (GDPR compliance).
   */
  async anonymize(id: string): Promise<void> {
    const anonymizedEmail = `deleted-${id}@anonymized.local`;

    await db.user.update({
      where: { id },
      data: {
        email: anonymizedEmail,
        firstName: "Deleted",
        lastName: "User",
        passwordHash: null,
        phone: null,
        avatarUrl: null,
        deletedAt: new Date(),
      },
    });
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  /**
   * Get user statistics for admin dashboard.
   */
  async getStatistics(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    newThisMonth: number;
    newThisWeek: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [total, byRole, newThisMonth, newThisWeek] = await Promise.all([
      this.count({ deletedAt: null }),
      db.user.groupBy({
        by: ["role"],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      this.count({ deletedAt: null, createdAt: { gte: startOfMonth } }),
      this.count({ deletedAt: null, createdAt: { gte: startOfWeek } }),
    ]);

    const roleCount = byRole.reduce(
      (acc, { role, _count }) => {
        acc[role] = _count.id;
        return acc;
      },
      {} as Record<UserRole, number>
    );

    return {
      total,
      byRole: roleCount,
      newThisMonth,
      newThisWeek,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance
// ─────────────────────────────────────────────────────────────────────────────

export const userRepository = new UserRepository();
