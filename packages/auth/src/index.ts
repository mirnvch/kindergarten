// @kindergarten/auth
// Shared authentication configuration for all apps
//
// This package provides NextAuth configuration and helpers.
// The full auth setup (with adapter) remains in each app until the split (Task #39).

// Export local types (not module augmentations to avoid conflicts)
export type { UserRole, AuthUser, AuthSession } from "./types";

export { authConfig } from "./config";
export type { default as AuthConfig } from "./config";

// Auth helpers will be added here
// export { requireAuth, requireAdmin, requireDaycareAccess } from "./helpers";

// Types
export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

export type DaycareStaffRole = "owner" | "manager" | "staff";

export interface DaycareContext {
  daycareId: string;
  daycareName: string;
  staffRole: DaycareStaffRole;
}

// Cross-domain cookie configuration for multi-app setup
export const cookieConfig = {
  // Cookie domain for cross-subdomain auth
  // Set to ".kindergarten.com" in production
  domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};
