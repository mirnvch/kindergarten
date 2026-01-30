import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import authConfig from "./auth.config";

// Custom adapter that handles firstName/lastName from OAuth
function CustomPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(db) as Adapter;

  return {
    ...baseAdapter,
    async createUser(user: AdapterUser & { firstName?: string; lastName?: string }) {
      // Extract firstName and lastName from the user object (set by profile callback)
      const firstName = user.firstName || user.name?.split(" ")[0] || "User";
      const lastName = user.lastName || user.name?.split(" ").slice(1).join(" ") || "";

      const created = await db.user.create({
        data: {
          email: user.email,
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

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

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
    async signIn({ user, account }) {
      // Allow OAuth without email verification
      if (account?.provider !== "credentials") {
        return true;
      }

      // Check if user exists and is active
      const existingUser = await db.user.findUnique({
        where: { id: user.id },
      });

      if (!existingUser?.isActive) {
        return false;
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
