/**
 * Next.js Middleware for security headers and CSP with nonce.
 *
 * This middleware runs on every request and:
 * 1. Generates a unique nonce for CSP
 * 2. Sets Content-Security-Policy header with nonce
 * 3. Passes nonce to layout via header
 *
 * Note: Auth is handled by proxy.ts (Next.js 16 pattern)
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Generate a cryptographically secure nonce.
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

/**
 * Build CSP header with nonce.
 * Removes unsafe-inline for scripts when nonce is provided.
 */
function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  // In development, we need 'unsafe-eval' for React Fast Refresh
  // In production, we use 'strict-dynamic' with nonce
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' https://js.pusher.com https://api.mapbox.com https://va.vercel-scripts.com`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://js.pusher.com https://api.mapbox.com https://va.vercel-scripts.com`;

  // Style nonce for inline styles (Tailwind JIT in dev)
  const styleSrc = isDev
    ? `'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com`
    : `'self' 'nonce-${nonce}' https://fonts.googleapis.com https://api.mapbox.com`;

  return `
    default-src 'self';
    script-src ${scriptSrc};
    style-src ${styleSrc};
    img-src 'self' blob: data: https://*.supabase.co https://res.cloudinary.com https://images.unsplash.com https://*.googleusercontent.com https://api.mapbox.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.pusher.com wss://*.pusher.com https://api.mapbox.com https://events.mapbox.com https://*.supabase.co https://*.sentry.io https://va.vercel-scripts.com;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function middleware(request: NextRequest) {
  // Generate nonce for this request
  const nonce = generateNonce();

  // Build CSP with nonce
  const cspHeader = buildCSP(nonce);

  // Clone response headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Create response with updated headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set security headers
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);

  // Additional security headers (some may be duplicated from next.config.ts, but middleware takes precedence)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|monitoring).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
