/**
 * Authorization System — Permission-based access control.
 *
 * Defines permissions, role-permission mappings, and authorization helpers.
 *
 * @example
 * // Check single permission
 * await authorize(userId, "booking:create");
 *
 * @example
 * // Check any of multiple permissions
 * await authorizeAny(userId, ["provider:read", "admin:all"]);
 *
 * @example
 * // Use with createSafeAction
 * export const deleteUser = createSafeAction(
 *   schema,
 *   handler,
 *   { permission: "admin:delete-user" }
 * );
 */

import { UserRole } from "@prisma/client";
import { ForbiddenError } from "@/lib/errors";
import { type ActionContext } from "@/lib/safe-action";

// ─────────────────────────────────────────────────────────────────────────────
// Permission Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All available permissions in the system.
 *
 * Format: `resource:action`
 *
 * Categories:
 * - user: User profile and account management
 * - family: Family member management
 * - appointment: Appointment/booking operations
 * - provider: Provider/daycare management
 * - review: Review operations
 * - message: Messaging operations
 * - admin: Administrative operations
 */
export type Permission =
  // User permissions
  | "user:read"
  | "user:write"
  | "user:delete"
  // Family member permissions
  | "family:read"
  | "family:write"
  | "family:delete"
  // Appointment/booking permissions
  | "appointment:read"
  | "appointment:create"
  | "appointment:update"
  | "appointment:cancel"
  // Provider permissions
  | "provider:read"
  | "provider:write"
  | "provider:manage-staff"
  | "provider:manage-schedule"
  | "provider:view-analytics"
  // Review permissions
  | "review:read"
  | "review:create"
  | "review:respond"
  | "review:delete"
  // Messaging permissions
  | "message:read"
  | "message:send"
  | "message:broadcast"
  // Admin permissions
  | "admin:read"
  | "admin:write"
  | "admin:delete-user"
  | "admin:delete-provider"
  | "admin:moderate"
  | "admin:verify"
  | "admin:all";

// ─────────────────────────────────────────────────────────────────────────────
// Role-Permission Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permissions granted to each role.
 *
 * Roles inherit permissions implicitly:
 * - ADMIN has all permissions
 * - PROVIDER inherits PATIENT permissions + provider-specific
 * - CLINIC_STAFF has limited provider permissions
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Patient (Parent) — Can manage their own profile, family, and appointments
  PATIENT: [
    "user:read",
    "user:write",
    "family:read",
    "family:write",
    "family:delete",
    "appointment:read",
    "appointment:create",
    "appointment:update",
    "appointment:cancel",
    "provider:read",
    "review:read",
    "review:create",
    "message:read",
    "message:send",
  ],

  // Provider (Daycare Owner) — Can manage their provider profile and appointments
  PROVIDER: [
    "user:read",
    "user:write",
    "appointment:read",
    "appointment:create",
    "appointment:update",
    "appointment:cancel",
    "provider:read",
    "provider:write",
    "provider:manage-staff",
    "provider:manage-schedule",
    "provider:view-analytics",
    "review:read",
    "review:respond",
    "message:read",
    "message:send",
    "message:broadcast",
  ],

  // Clinic Staff — Limited provider permissions (no ownership actions)
  CLINIC_STAFF: [
    "user:read",
    "appointment:read",
    "appointment:update",
    "provider:read",
    "provider:manage-schedule",
    "review:read",
    "message:read",
    "message:send",
  ],

  // Admin — Full access to everything
  ADMIN: [
    "user:read",
    "user:write",
    "user:delete",
    "family:read",
    "family:write",
    "family:delete",
    "appointment:read",
    "appointment:create",
    "appointment:update",
    "appointment:cancel",
    "provider:read",
    "provider:write",
    "provider:manage-staff",
    "provider:manage-schedule",
    "provider:view-analytics",
    "review:read",
    "review:create",
    "review:respond",
    "review:delete",
    "message:read",
    "message:send",
    "message:broadcast",
    "admin:read",
    "admin:write",
    "admin:delete-user",
    "admin:delete-provider",
    "admin:moderate",
    "admin:verify",
    "admin:all",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Authorization Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  // Admin "admin:all" grants everything
  if (ROLE_PERMISSIONS[role]?.includes("admin:all")) {
    return true;
  }

  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization Middleware for createSafeAction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an authorization check function for use with createSafeAction.
 *
 * @example
 * // In action options
 * { authorize: requirePermission("admin:delete-user") }
 */
export function requirePermission(permission: Permission) {
  return (ctx: ActionContext): void => {
    const role = ctx.role as UserRole;

    if (!hasPermission(role, permission)) {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }
  };
}

/**
 * Require any of multiple permissions.
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (ctx: ActionContext): void => {
    const role = ctx.role as UserRole;

    if (!hasAnyPermission(role, permissions)) {
      throw new ForbiddenError(`Missing any of permissions: ${permissions.join(", ")}`);
    }
  };
}

/**
 * Require all permissions.
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return (ctx: ActionContext): void => {
    const role = ctx.role as UserRole;

    if (!hasAllPermissions(role, permissions)) {
      throw new ForbiddenError(`Missing permissions: ${permissions.join(", ")}`);
    }
  };
}

/**
 * Require specific role(s).
 */
export function requireRole(...roles: UserRole[]) {
  return (ctx: ActionContext): void => {
    const userRole = ctx.role as UserRole;

    if (!roles.includes(userRole)) {
      throw new ForbiddenError(`Required role: ${roles.join(" or ")}`);
    }
  };
}

/**
 * Require admin role.
 */
export function requireAdmin() {
  return requireRole(UserRole.ADMIN);
}

/**
 * Require provider or admin role.
 */
export function requireProviderOrAdmin() {
  return requireRole(UserRole.PROVIDER, UserRole.ADMIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource-based Authorization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if user owns a resource (for patient-specific resources).
 * Admins bypass this check.
 */
export function requireOwnership(
  ctx: ActionContext,
  resourceOwnerId: string,
  resourceName: string = "resource"
): void {
  const role = ctx.role as UserRole;

  // Admins can access any resource
  if (role === UserRole.ADMIN) {
    return;
  }

  if (ctx.userId !== resourceOwnerId) {
    throw new ForbiddenError(`You don't have access to this ${resourceName}`);
  }
}

/**
 * Check if user is associated with a provider.
 * Used for provider-specific resources.
 */
export function requireProviderAccess(
  ctx: ActionContext,
  providerId: string,
  userProviderIds: string[],
  resourceName: string = "provider resource"
): void {
  const role = ctx.role as UserRole;

  // Admins can access any provider
  if (role === UserRole.ADMIN) {
    return;
  }

  // Check if user is associated with this provider
  if (!userProviderIds.includes(providerId)) {
    throw new ForbiddenError(`You don't have access to this ${resourceName}`);
  }
}
