// @kindergarten/auth types
// These are local types for the auth package only.
// The main app has its own type augmentations in src/lib/auth.ts

export type UserRole = "PARENT" | "DAYCARE_OWNER" | "DAYCARE_STAFF" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  image?: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

// Note: Module augmentations are done in the main app (src/lib/auth.ts)
// to avoid conflicts. When we split apps (Task #39), each app will
// have its own type augmentations or use shared ones from this package.
