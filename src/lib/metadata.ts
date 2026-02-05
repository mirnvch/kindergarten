/**
 * Metadata utilities for SEO optimization.
 *
 * Provides helpers for creating consistent, SEO-friendly metadata across pages.
 *
 * @example
 * // In a page
 * export const metadata = createMetadata({
 *   title: "Search Doctors",
 *   description: "Find the best doctors in your area",
 *   path: "/search",
 * });
 *
 * @example
 * // Dynamic metadata
 * export async function generateMetadata({ params }) {
 *   const provider = await getProvider(params.slug);
 *   return createMetadata({
 *     title: provider.name,
 *     description: provider.description,
 *     path: `/providers/${provider.slug}`,
 *     image: provider.image,
 *   });
 * }
 */

import { type Metadata } from "next";
import { siteConfig } from "@/config/site";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateMetadataOptions {
  /** Page title (will be suffixed with site name) */
  title: string;
  /** Page description for SEO */
  description: string;
  /** URL path (e.g., "/search") */
  path: string;
  /** OG image URL (defaults to site OG image) */
  image?: string;
  /** Additional keywords */
  keywords?: string[];
  /** Disable indexing */
  noIndex?: boolean;
  /** Disable following links */
  noFollow?: boolean;
  /** Page type for Open Graph */
  type?: "website" | "article" | "profile";
  /** Published date for articles */
  publishedTime?: string;
  /** Modified date for articles */
  modifiedTime?: string;
  /** Author for articles */
  author?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata Creator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create SEO-optimized metadata for a page.
 */
export function createMetadata({
  title,
  description,
  path,
  image,
  keywords = [],
  noIndex = false,
  noFollow = false,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
}: CreateMetadataOptions): Metadata {
  const url = `${siteConfig.url}${path}`;
  const ogImage = image ?? siteConfig.ogImage;
  const allKeywords = [...siteConfig.keywords, ...keywords];

  // Build robots directive
  const robots: Metadata["robots"] = {};
  if (noIndex) robots.index = false;
  if (noFollow) robots.follow = false;

  const metadata: Metadata = {
    title,
    description,
    keywords: allKeywords,
    authors: author ? [{ name: author }] : [{ name: siteConfig.creator }],
    creator: siteConfig.creator,

    // Canonical URL
    alternates: {
      canonical: url,
    },

    // Open Graph
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type,
      locale: "en_US",
      images: [
        {
          url: ogImage.startsWith("http") ? ogImage : `${siteConfig.url}${ogImage}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(type === "article" && {
        publishedTime,
        modifiedTime,
        authors: author ? [author] : undefined,
      }),
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.startsWith("http") ? ogImage : `${siteConfig.url}${ogImage}`],
      creator: "@docconnect",
    },

    // Robots
    ...(Object.keys(robots).length > 0 && { robots }),
  };

  return metadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-specific Metadata Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create metadata for a provider page.
 */
export function createProviderMetadata(provider: {
  name: string;
  specialty?: string;
  description?: string;
  city?: string;
  slug: string;
  image?: string;
}): Metadata {
  const title = provider.specialty ? `${provider.name} - ${provider.specialty}` : provider.name;

  const description =
    provider.description ??
    `Book an appointment with ${provider.name}${provider.city ? ` in ${provider.city}` : ""}. Read patient reviews and view available times.`;

  return createMetadata({
    title,
    description,
    path: `/providers/${provider.slug}`,
    image: provider.image,
    keywords: [
      provider.name,
      provider.specialty ?? "doctor",
      provider.city ?? "",
      "appointment",
      "booking",
    ].filter(Boolean),
    type: "profile",
  });
}

/**
 * Create metadata for a search results page.
 */
export function createSearchMetadata(params: {
  query?: string;
  city?: string;
  specialty?: string;
}): Metadata {
  const parts = [];
  if (params.specialty) parts.push(params.specialty);
  if (params.city) parts.push(`in ${params.city}`);
  if (params.query) parts.push(`"${params.query}"`);

  const title = parts.length > 0 ? `Find ${parts.join(" ")}` : "Search Doctors";

  const description =
    parts.length > 0
      ? `Find the best ${parts.join(" ")}. Browse verified providers, read reviews, and book appointments online.`
      : "Search for doctors, clinics, and healthcare providers. Filter by specialty, location, insurance, and more.";

  // Build path with query params
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set("q", params.query);
  if (params.city) searchParams.set("city", params.city);
  if (params.specialty) searchParams.set("specialty", params.specialty);

  const path = searchParams.toString() ? `/search?${searchParams}` : "/search";

  return createMetadata({
    title,
    description,
    path,
    keywords: [
      params.specialty ?? "doctor",
      params.city ?? "",
      "search",
      "find doctor",
      "healthcare",
    ].filter(Boolean),
  });
}

/**
 * Create metadata for blog/article pages.
 */
export function createArticleMetadata(article: {
  title: string;
  description: string;
  slug: string;
  image?: string;
  author?: string;
  publishedAt: string;
  updatedAt?: string;
}): Metadata {
  return createMetadata({
    title: article.title,
    description: article.description,
    path: `/blog/${article.slug}`,
    image: article.image,
    type: "article",
    author: article.author,
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
  });
}
