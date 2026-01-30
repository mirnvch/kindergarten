import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";

// Edge-compatible config (no adapter, no bcrypt, no db)
// This is used by middleware
export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      profile(profile) {
        // Map Google profile to our User model
        const nameParts = (profile.name || "").split(" ");
        const firstName = nameParts[0] || profile.given_name || "User";
        const lastName = nameParts.slice(1).join(" ") || profile.family_name || "";

        return {
          id: profile.sub,
          email: profile.email,
          firstName,
          lastName,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    // Credentials provider needs authorize function in full auth.ts
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Authorize is handled in auth.ts, not here
      authorize: () => null,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role as UserRole | undefined;

      const protectedRoutes = ["/dashboard", "/portal", "/admin"];
      const authRoutes = ["/login", "/register"];

      const roleRoutes: Record<string, string[]> = {
        "/dashboard": ["PARENT"],
        "/portal": ["DAYCARE_OWNER", "DAYCARE_STAFF"],
        "/admin": ["ADMIN"],
      };

      const pathname = nextUrl.pathname;

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && authRoutes.some((route) => pathname.startsWith(route))) {
        const redirectUrl = getDefaultRedirect(userRole);
        return Response.redirect(new URL(redirectUrl, nextUrl));
      }

      // Check protected routes
      for (const route of protectedRoutes) {
        if (pathname.startsWith(route)) {
          if (!isLoggedIn) {
            return false; // Will redirect to signIn page
          }

          // Check role-based access
          const allowedRoles = roleRoutes[route];
          if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
            const redirectUrl = getDefaultRedirect(userRole);
            return Response.redirect(new URL(redirectUrl, nextUrl));
          }
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

function getDefaultRedirect(role?: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DAYCARE_OWNER":
    case "DAYCARE_STAFF":
      return "/portal";
    case "PARENT":
      return "/dashboard";
    default:
      return "/";
  }
}
