"use server";

import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { recordLoginAttempt } from "@/server/actions/security/login-tracking";
import { check2FAEnabled, set2FASessionVerified, clear2FASession } from "@/server/actions/security/two-factor";
import crypto from "crypto";
import { cookies } from "next/headers";

// ==================== VALIDATION CONSTANTS ====================

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 255;

// Common disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  "tempmail.com", "throwaway.com", "mailinator.com", "guerrillamail.com",
  "10minutemail.com", "temp-mail.org", "fakeinbox.com", "trashmail.com"
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize email: lowercase and trim
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if email domain is disposable
 */
function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Sanitize name: trim and remove extra spaces
 */
function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// ==================== VALIDATION SCHEMAS ====================

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(EMAIL_MAX_LENGTH, `Email must be less than ${EMAIL_MAX_LENGTH} characters`)
  .email("Please enter a valid email address")
  .transform(normalizeEmail)
  .refine((email) => !isDisposableEmail(email), {
    message: "Disposable email addresses are not allowed",
  });

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be less than ${PASSWORD_MAX_LENGTH} characters`)
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)");

const nameSchema = z
  .string()
  .min(NAME_MIN_LENGTH, "Name is required")
  .max(NAME_MAX_LENGTH, `Name must be less than ${NAME_MAX_LENGTH} characters`)
  .regex(/^[a-zA-Zа-яА-ЯёЁіІїЇєЄ\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
  .transform(sanitizeName);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(["PARENT", "DAYCARE_OWNER"]).default("PARENT"),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Action results
type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
  requires2FA?: boolean;
  userId?: string;
};

/**
 * Get IP address from request headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Get user agent from request headers
 */
async function getUserAgent(): Promise<string | undefined> {
  const headersList = await headers();
  return headersList.get("user-agent") || undefined;
}

export async function registerUser(
  input: RegisterInput
): Promise<ActionResult<{ userId: string }>> {
  try {
    const validatedData = registerSchema.parse(input);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
      include: {
        accounts: {
          select: { provider: true },
        },
      },
    });

    if (existingUser) {
      // Check if user signed up via OAuth (Google)
      const hasOAuthAccount = existingUser.accounts.some(
        (acc) => acc.provider === "google"
      );

      if (hasOAuthAccount && !existingUser.passwordHash) {
        // User signed up with Google, offer to link accounts
        return {
          success: false,
          error: "This email is already registered via Google. Please sign in with Google, or use a different email.",
        };
      }

      if (existingUser.passwordHash) {
        return {
          success: false,
          error: "An account with this email already exists. Please sign in instead.",
        };
      }

      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role as UserRole,
      },
    });

    return {
      success: true,
      data: { userId: user.id },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return all validation errors for better UX
      const errors = error.issues.map((issue) => issue.message);
      return {
        success: false,
        error: errors[0], // Return first error for simplicity
      };
    }
    console.error("Registration error:", error);
    return {
      success: false,
      error: "Registration failed. Please try again later.",
    };
  }
}

export async function loginWithCredentials(
  input: LoginInput
): Promise<ActionResult> {
  const ipAddress = await getClientIP();
  const userAgent = await getUserAgent();

  try {
    const validatedData = loginSchema.parse(input);

    // Check if user exists and has a password
    const user = await db.user.findUnique({
      where: { email: validatedData.email },
      include: {
        accounts: {
          select: { provider: true },
        },
      },
    });

    if (!user) {
      // Record failed attempt
      await recordLoginAttempt({
        email: validatedData.email,
        success: false,
        reason: "user_not_found",
        ipAddress,
        userAgent,
      });

      // Generic error to prevent email enumeration
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Check if user only has OAuth and no password
    if (!user.passwordHash) {
      const hasGoogleAccount = user.accounts.some((acc) => acc.provider === "google");

      await recordLoginAttempt({
        email: validatedData.email,
        success: false,
        reason: "oauth_only",
        ipAddress,
        userAgent,
      });

      if (hasGoogleAccount) {
        return {
          success: false,
          error: "This account uses Google sign-in. Please use the 'Continue with Google' button.",
        };
      }
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Check if user is active
    if (!user.isActive) {
      await recordLoginAttempt({
        email: validatedData.email,
        success: false,
        reason: "account_inactive",
        ipAddress,
        userAgent,
      });

      return {
        success: false,
        error: "This account has been deactivated. Please contact support.",
      };
    }

    // Verify password before checking 2FA
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      await recordLoginAttempt({
        email: validatedData.email,
        success: false,
        reason: "invalid_password",
        ipAddress,
        userAgent,
      });

      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Check if 2FA is enabled
    const has2FA = await check2FAEnabled(user.id);

    if (has2FA) {
      // Record partial success - 2FA required
      await recordLoginAttempt({
        email: validatedData.email,
        success: false,
        reason: "2fa_required",
        ipAddress,
        userAgent,
      });

      // Store credentials in encrypted cookie for completing login after 2FA
      const pendingLoginData = JSON.stringify({
        email: validatedData.email,
        password: validatedData.password,
        timestamp: Date.now(),
      });

      const encryptionKey = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
      if (encryptionKey) {
        const key = crypto.scryptSync(encryptionKey, "pending-2fa", 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
        let encrypted = cipher.update(pendingLoginData, "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag();

        const cookieValue = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;

        const cookieStore = await cookies();
        cookieStore.set("pending_2fa_login", cookieValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 300, // 5 minutes
          path: "/",
        });
      }

      return {
        success: false,
        requires2FA: true,
        userId: user.id,
        error: "Two-factor authentication required",
      };
    }

    // Complete login
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    // Record successful login
    await recordLoginAttempt({
      email: validatedData.email,
      success: true,
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }
    if (error instanceof AuthError) {
      // Record failed attempt
      await recordLoginAttempt({
        email: input.email,
        success: false,
        reason: error.type,
        ipAddress,
        userAgent,
      });

      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            error: "Invalid email or password",
          };
        case "AccessDenied":
          return {
            success: false,
            error: "Access denied. Your account may be deactivated.",
          };
        default:
          return {
            success: false,
            error: "Sign in failed. Please try again.",
          };
      }
    }
    throw error;
  }
}

/**
 * Complete login after successful 2FA verification
 * Handles both credential login (with pending cookie) and OAuth login (no cookie)
 */
export async function complete2FALogin(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const pendingCookie = cookieStore.get("pending_2fa_login");
    const oauthPendingCookie = cookieStore.get("oauth_2fa_pending");

    if (pendingCookie?.value) {
      // Credential login flow - complete the sign in
      const encryptionKey = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
      if (!encryptionKey) {
        return { success: false, error: "Server configuration error" };
      }

      const [ivHex, authTagHex, encrypted] = pendingCookie.value.split(":");
      const key = crypto.scryptSync(encryptionKey, "pending-2fa", 32);
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      const { email, password, timestamp } = JSON.parse(decrypted);

      // Check if the pending login hasn't expired (5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        cookieStore.delete("pending_2fa_login");
        return { success: false, error: "Login session expired. Please try again." };
      }

      // Complete the login with NextAuth
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      // Delete the pending login cookie
      cookieStore.delete("pending_2fa_login");

      // Record successful login
      await recordLoginAttempt({
        email,
        success: true,
        ipAddress: "unknown",
        userAgent: undefined,
      });
    }

    // Clear OAuth 2FA pending cookie if it exists
    if (oauthPendingCookie?.value) {
      cookieStore.delete("oauth_2fa_pending");
    }

    // Set 2FA session verified cookie for both flows
    await set2FASessionVerified(userId);

    return { success: true };
  } catch (error) {
    console.error("[Auth] Complete 2FA login failed:", error);
    return { success: false, error: "Failed to complete login" };
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logout() {
  // Clear 2FA session cookie on logout
  await clear2FASession();
  await signOut({ redirectTo: "/" });
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      isActive: true,
    },
  });
}
