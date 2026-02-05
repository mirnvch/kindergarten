import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

// Next.js 16: proxy.ts replaces middleware.ts
// Uses Node.js runtime (not Edge), but we keep auth.config for lightweight checks
// Full database operations happen in Server Components/Actions, not here
const { auth } = NextAuth(authConfig);

// Export as 'proxy' for Next.js 16 convention
export { auth as proxy };

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
