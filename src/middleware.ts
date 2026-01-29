import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/portal", "/admin", "/parent"];

// Routes that require specific roles
const roleRoutes: Record<string, string[]> = {
  "/dashboard": ["PARENT"],
  "/parent": ["PARENT"],
  "/portal": ["DAYCARE_OWNER", "DAYCARE_STAFF"],
  "/admin": ["ADMIN"],
};

// Routes that should redirect to dashboard if already logged in
const authRoutes = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get the token from the request
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  const isLoggedIn = !!token;
  const userRole = token?.role as string | undefined;

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && authRoutes.some((route) => pathname.startsWith(route))) {
    const redirectUrl = getDefaultRedirect(userRole);
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Check protected routes
  for (const route of protectedRoutes) {
    if (pathname.startsWith(route)) {
      // Not logged in - redirect to login
      if (!isLoggedIn) {
        const callbackUrl = encodeURIComponent(pathname);
        return NextResponse.redirect(
          new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
        );
      }

      // Check role-based access
      const allowedRoles = roleRoutes[route];
      if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        // User doesn't have permission - redirect to their default page
        const redirectUrl = getDefaultRedirect(userRole);
        return NextResponse.redirect(new URL(redirectUrl, req.url));
      }
    }
  }

  return NextResponse.next();
}

function getDefaultRedirect(role?: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DAYCARE_OWNER":
    case "DAYCARE_STAFF":
      return "/portal";
    case "PARENT":
      return "/parent";
    default:
      return "/dashboard";
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
