import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import authConfig from "./auth.config";
import { cookies } from "next/headers";

// Custom adapter that handles firstName/lastName from OAuth and account linking
function CustomPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(db) as Adapter;

  return {
    ...baseAdapter,

    // Override getUserByEmail to return proper format
    async getUserByEmail(email: string) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: `${user.firstName} ${user.lastName}`.trim(),
        image: user.avatarUrl,
      };
    },

    // Override createUser to handle firstName/lastName
    async createUser(user: AdapterUser & { firstName?: string; lastName?: string }) {
      // Normalize email
      const normalizedEmail = user.email.toLowerCase().trim();

      // Check if user already exists (for account linking scenario)
      const existingUser = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        // User exists - return existing user (account will be linked via linkAccount)
        return {
          id: existingUser.id,
          email: existingUser.email,
          emailVerified: existingUser.emailVerified,
          name: `${existingUser.firstName} ${existingUser.lastName}`.trim(),
          image: existingUser.avatarUrl,
        };
      }

      // Extract firstName and lastName from the user object (set by profile callback)
      const firstName = user.firstName || user.name?.split(" ")[0] || "User";
      const lastName = user.lastName || user.name?.split(" ").slice(1).join(" ") || "";

      const created = await db.user.create({
        data: {
          email: normalizedEmail,
          emailVerified: user.emailVerified,
          firstName,
          lastName,
          avatarUrl: user.image,
        },
      });

      return {
        id: created.id,
        email: created.email,
        emailVerified: created.emailVerified,
        name: `${created.firstName} ${created.lastName}`.trim(),
        image: created.avatarUrl,
      };
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: CustomPrismaAdapter(),
  providers: [
    // Keep Google from config
    ...authConfig.providers.filter((p) => p.id !== "credentials"),
    // Override Credentials with full authorize function
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Normalize email (lowercase, trim)
        const normalizedEmail = (credentials.email as string).toLowerCase().trim();

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        // Check if user exists
        if (!user) {
          return null;
        }

        // Check if user has a password (might be OAuth-only)
        if (!user.passwordHash) {
          return null;
        }

        // Check if user is active
        if (!user.isActive) {
          return null;
        }

        // Verify password
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatarUrl,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in (Google)
      if (account?.provider === "google" && user.email) {
        // Check if user with this email already exists
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
          include: {
            accounts: {
              select: { provider: true },
            },
          },
        });

        if (existingUser) {
          // Check if user is active
          if (!existingUser.isActive) {
            return "/login?error=AccountDeactivated";
          }

          // 2FA check is handled in events.signIn - it sets oauth_2fa_pending cookie
          // Middleware will redirect to /login/verify-2fa if cookie is present

          // Check if already has Google linked
          const hasGoogleLinked = existingUser.accounts.some(
            (acc) => acc.provider === "google"
          );

          if (!hasGoogleLinked) {
            // User exists with password but no Google account - link it
            // NextAuth will handle linking via the adapter
            return true;
          }

          // User already has Google linked - allow sign-in
          return true;
        }

        // New user - allow sign-up via OAuth
        return true;
      }

      // Handle credentials sign-in
      if (account?.provider === "credentials") {
        const existingUser = await db.user.findUnique({
          where: { id: user.id },
        });

        if (!existingUser?.isActive) {
          return "/login?error=AccountDeactivated";
        }

        return true;
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Fetch full user data from database
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
        }
      }

      // Handle session update
      if (trigger === "update" && session) {
        token.firstName = session.firstName;
        token.lastName = session.lastName;
      }

      return token;
    },
  },
  events: {
    async signIn({ user, account }) {
      // Handle 2FA requirement for OAuth users
      // TODO: Re-enable after fixing TwoFactorAuth table migration
      // if (account?.provider === "google" && user.email) {
      //   const dbUser = await db.user.findUnique({
      //     where: { email: user.email },
      //     include: {
      //       twoFactorAuth: {
      //         select: { enabled: true },
      //       },
      //     },
      //   });

      //   if (dbUser?.twoFactorAuth?.enabled) {
      //     // Set a cookie to indicate 2FA verification is pending for OAuth
      //     const cookieStore = await cookies();
      //     cookieStore.set("oauth_2fa_pending", dbUser.id, {
      //       httpOnly: true,
      //       secure: process.env.NODE_ENV === "production",
      //       sameSite: "lax",
      //       maxAge: 300, // 5 minutes
      //       path: "/",
      //     });
      //   }
      // }
    },
    async linkAccount({ user }) {
      // Update emailVerified for OAuth users
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
});

// Types for extended session and user
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      image?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    firstName?: string;
    lastName?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  }
}
