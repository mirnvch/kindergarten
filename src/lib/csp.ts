/**
 * CSP (Content Security Policy) utilities.
 *
 * Provides helpers for working with CSP nonces in Server Components.
 */

import { headers } from "next/headers";

/**
 * Get the CSP nonce from request headers.
 * The nonce is set by middleware.ts on each request.
 *
 * @example
 * ```tsx
 * // In a Server Component or layout
 * const nonce = await getNonce();
 * return <Script nonce={nonce} src="..." />;
 * ```
 */
export async function getNonce(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-nonce") ?? "";
}

/**
 * Script tag props with nonce for inline scripts.
 * Use this to create script elements that comply with CSP.
 *
 * @example
 * ```tsx
 * const scriptProps = await getScriptProps();
 * return <script {...scriptProps}>{`console.log('safe')`}</script>;
 * ```
 */
export async function getScriptProps(): Promise<{ nonce: string }> {
  const nonce = await getNonce();
  return { nonce };
}

/**
 * Style tag props with nonce for inline styles.
 * Use this to create style elements that comply with CSP.
 *
 * @example
 * ```tsx
 * const styleProps = await getStyleProps();
 * return <style {...styleProps}>{`.custom { color: red; }`}</style>;
 * ```
 */
export async function getStyleProps(): Promise<{ nonce: string }> {
  const nonce = await getNonce();
  return { nonce };
}
