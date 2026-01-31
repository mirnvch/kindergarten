"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * RBAC (Role-Based Access Control) Helpers
 *
 * User Roles (from User.role):
 * - PARENT: Regular parent user, can browse daycares, book tours, manage children
 * - DAYCARE_OWNER: User who owns/is associated with a daycare
 * - DAYCARE_STAFF: User who works at a daycare (manager or staff)
 * - ADMIN: Platform administrator with full access
 *
 * Daycare Staff Roles (from DaycareStaff.role):
 * - owner: Full control over daycare, can manage staff, billing, settings
 * - manager: Can manage bookings, respond to reviews, send messages
 * - staff: Read-only access to bookings and messages
 *
 * Role Hierarchy:
 * owner > manager > staff
 */

export type DaycareStaffRole = "owner" | "manager" | "staff";

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

export interface DaycareContext {
  daycareId: string;
  daycareName: string;
  staffRole: DaycareStaffRole;
}

/**
 * Require authenticated user
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    email: session.user.email || "",
    role: session.user.role,
  };
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthContext> {
  const context = await requireAuth();

  if (context.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return context;
}

/**
 * Require daycare staff access (any role)
 * Returns the user's daycare context
 */
export async function requireDaycareAccess(): Promise<AuthContext & DaycareContext> {
  const context = await requireAuth();

  const staff = await db.daycareStaff.findFirst({
    where: {
      userId: context.userId,
      isActive: true,
    },
    include: {
      daycare: {
        select: { id: true, name: true },
      },
    },
  });

  if (!staff) {
    throw new Error("Daycare access required");
  }

  return {
    ...context,
    daycareId: staff.daycare.id,
    daycareName: staff.daycare.name,
    staffRole: staff.role as DaycareStaffRole,
  };
}

/**
 * Require specific daycare staff role or higher
 * Role hierarchy: owner > manager > staff
 */
export async function requireDaycareRole(
  minRole: DaycareStaffRole
): Promise<AuthContext & DaycareContext> {
  const context = await requireDaycareAccess();

  const roleHierarchy: Record<DaycareStaffRole, number> = {
    owner: 3,
    manager: 2,
    staff: 1,
  };

  if (roleHierarchy[context.staffRole] < roleHierarchy[minRole]) {
    throw new Error(`${minRole} access required`);
  }

  return context;
}

/**
 * Require daycare owner role
 */
export async function requireDaycareOwner(): Promise<AuthContext & DaycareContext> {
  return requireDaycareRole("owner");
}

/**
 * Require daycare manager role or higher
 */
export async function requireDaycareManager(): Promise<AuthContext & DaycareContext> {
  return requireDaycareRole("manager");
}

/**
 * Check if current user has specific daycare role
 * Returns null if not authorized, context if authorized
 */
export async function checkDaycareRole(
  minRole: DaycareStaffRole
): Promise<(AuthContext & DaycareContext) | null> {
  try {
    return await requireDaycareRole(minRole);
  } catch {
    return null;
  }
}

/**
 * Permission matrix for portal actions
 *
 * Action                    | Owner | Manager | Staff
 * --------------------------|-------|---------|-------
 * View bookings             |   ✓   |    ✓    |   ✓
 * Confirm/decline bookings  |   ✓   |    ✓    |   ✗
 * View messages             |   ✓   |    ✓    |   ✓
 * Send messages             |   ✓   |    ✓    |   ✗
 * View reviews              |   ✓   |    ✓    |   ✓
 * Respond to reviews        |   ✓   |    ✓    |   ✗
 * View analytics            |   ✓   |    ✓    |   ✓
 * Edit daycare profile      |   ✓   |    ✗    |   ✗
 * Manage programs/pricing   |   ✓   |    ✗    |   ✗
 * Manage staff              |   ✓   |    ✗    |   ✗
 * View billing              |   ✓   |    ✗    |   ✗
 * Manage subscription       |   ✓   |    ✗    |   ✗
 * View waitlist             |   ✓   |    ✓    |   ✓
 * Notify waitlist           |   ✓   |    ✓    |   ✗
 */
