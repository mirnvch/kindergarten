import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware for admin app
// Full auth will be added when migrating routes
export function middleware(request: NextRequest) {
  // For now, just pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
