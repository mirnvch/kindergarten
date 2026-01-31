import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "./types";

/**
 * Edge-compatible config (no adapter, no bcrypt, no db)
 * This is used by middleware for route protection
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      profile(profile) {
        // Map Google profile to our User model
        const nameParts = (profile.name || "").split(" ");
        const firstName = nameParts[0] || profile.given_name || "User";
        const lastName =
          nameParts.slice(1).join(" ") || profile.family_name || "";

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
      // Use type assertion for extended user properties
      const extUser = auth?.user as { role?: UserRole } | undefined;
      const userRole = extUser?.role;

      const protectedRoutes = ["/dashboard", "/portal", "/admin"];
      const authRoutes = ["/login", "/register"];
      // Pages that should be accessible even when logged in (2FA verification, etc.)
      const allowedAuthPages = ["/login/verify-2fa"];

      const pathname = nextUrl.pathname;

      const roleRoutes: Record<string, string[]> = {
        "/dashboard": ["PARENT"],
        "/portal": ["DAYCARE_OWNER", "DAYCARE_STAFF"],
        "/admin": ["ADMIN"],
      };

      // Allow access to specific auth pages even when logged in
      if (allowedAuthPages.some((page) => pathname.startsWith(page))) {
        return true;
      }

      // Redirect logged-in users away from auth pages
      if (
        isLoggedIn &&
        authRoutes.some((route) => pathname.startsWith(route))
      ) {
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
        // Use type assertion for extended user properties
        const extUser = user as { role?: UserRole; firstName?: string; lastName?: string };
        token.role = extUser.role;
        token.firstName = extUser.firstName;
        token.lastName = extUser.lastName;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        // Use type assertion for extended session properties
        const extSession = session as { user: { id?: string; role?: UserRole; firstName?: string; lastName?: string } };
        extSession.user.id = token.id as string;
        extSession.user.role = token.role as UserRole;
        extSession.user.firstName = token.firstName as string;
        extSession.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
};

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

export default authConfig;
