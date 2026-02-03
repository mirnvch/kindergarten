"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * RBAC (Role-Based Access Control) Helpers
 *
 * User Roles (from User.role):
 * - PATIENT: Regular user, can browse providers, book appointments, manage family
 * - PROVIDER: User who owns/is associated with a practice/clinic
 * - CLINIC_STAFF: User who works at a clinic (manager or staff)
 * - ADMIN: Platform administrator with full access
 *
 * Provider Staff Roles (from ProviderStaff.role):
 * - owner: Full control over practice, can manage staff, billing, settings
 * - manager: Can manage appointments, respond to reviews, send messages
 * - staff: Read-only access to appointments and messages
 *
 * Role Hierarchy:
 * owner > manager > staff
 */

export type ProviderStaffRole = "owner" | "manager" | "staff";
/** @deprecated Use ProviderStaffRole */
export type DaycareStaffRole = ProviderStaffRole;

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

export interface ProviderContext {
  providerId: string;
  providerName: string;
  staffRole: ProviderStaffRole;
}
/** @deprecated Use ProviderContext */
export type DaycareContext = ProviderContext;

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
 * Require provider staff access (any role)
 * Returns the user's provider context
 */
export async function requireProviderAccess(): Promise<AuthContext & ProviderContext> {
  const context = await requireAuth();

  const staff = await db.providerStaff.findFirst({
    where: {
      userId: context.userId,
      isActive: true,
    },
    include: {
      provider: {
        select: { id: true, name: true },
      },
    },
  });

  if (!staff) {
    throw new Error("Provider access required");
  }

  return {
    ...context,
    providerId: staff.provider.id,
    providerName: staff.provider.name,
    staffRole: staff.role as ProviderStaffRole,
  };
}

/** @deprecated Use requireProviderAccess */
export const requireDaycareAccess = requireProviderAccess;

/**
 * Require specific provider staff role or higher
 * Role hierarchy: owner > manager > staff
 */
export async function requireProviderRole(
  minRole: ProviderStaffRole
): Promise<AuthContext & ProviderContext> {
  const context = await requireProviderAccess();

  const roleHierarchy: Record<ProviderStaffRole, number> = {
    owner: 3,
    manager: 2,
    staff: 1,
  };

  if (roleHierarchy[context.staffRole] < roleHierarchy[minRole]) {
    throw new Error(`${minRole} access required`);
  }

  return context;
}

/** @deprecated Use requireProviderRole */
export const requireDaycareRole = requireProviderRole;

/**
 * Require provider owner role
 */
export async function requireProviderOwner(): Promise<AuthContext & ProviderContext> {
  return requireProviderRole("owner");
}

/** @deprecated Use requireProviderOwner */
export const requireDaycareOwner = requireProviderOwner;

/**
 * Require provider manager role or higher
 */
export async function requireProviderManager(): Promise<AuthContext & ProviderContext> {
  return requireProviderRole("manager");
}

/** @deprecated Use requireProviderManager */
export const requireDaycareManager = requireProviderManager;

/**
 * Check if current user has specific provider role
 * Returns null if not authorized, context if authorized
 */
export async function checkProviderRole(
  minRole: ProviderStaffRole
): Promise<(AuthContext & ProviderContext) | null> {
  try {
    return await requireProviderRole(minRole);
  } catch {
    return null;
  }
}

/** @deprecated Use checkProviderRole */
export const checkDaycareRole = checkProviderRole;

/**
 * Permission matrix for portal actions
 *
 * Action                    | Owner | Manager | Staff
 * --------------------------|-------|---------|-------
 * View appointments         |   ✓   |    ✓    |   ✓
 * Confirm/decline bookings  |   ✓   |    ✓    |   ✗
 * View messages             |   ✓   |    ✓    |   ✓
 * Send messages             |   ✓   |    ✓    |   ✗
 * View reviews              |   ✓   |    ✓    |   ✓
 * Respond to reviews        |   ✓   |    ✓    |   ✗
 * View analytics            |   ✓   |    ✓    |   ✓
 * Edit provider profile     |   ✓   |    ✗    |   ✗
 * Manage services/pricing   |   ✓   |    ✗    |   ✗
 * Manage staff              |   ✓   |    ✗    |   ✗
 * View billing              |   ✓   |    ✗    |   ✗
 * Manage subscription       |   ✓   |    ✗    |   ✗
 * View waitlist             |   ✓   |    ✓    |   ✓
 * Notify waitlist           |   ✓   |    ✓    |   ✗
 */
