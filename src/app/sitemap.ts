/**
 * Dynamic sitemap generation for SEO.
 *
 * Generates sitemap.xml with all public pages.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import { type MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { ProviderStatus } from "@prisma/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic provider pages
  let providerPages: MetadataRoute.Sitemap = [];
  try {
    const providers = await db.provider.findMany({
      where: {
        status: ProviderStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    providerPages = providers.map((provider) => ({
      url: `${baseUrl}/providers/${provider.slug}`,
      lastModified: provider.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    // If database is unavailable, skip dynamic pages
    console.error("Failed to fetch providers for sitemap:", error);
  }

  // Specialty pages (if you have them)
  const specialtyPages: MetadataRoute.Sitemap = [
    "family-medicine",
    "internal-medicine",
    "pediatrics",
    "cardiology",
    "dermatology",
    "orthopedics",
    "psychiatry",
    "neurology",
    "obstetrics-gynecology",
  ].map((specialty) => ({
    url: `${baseUrl}/search?specialty=${specialty}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // City pages (if you have them)
  const cityPages: MetadataRoute.Sitemap = [
    "new-york",
    "los-angeles",
    "chicago",
    "houston",
    "phoenix",
    "philadelphia",
    "san-antonio",
    "san-diego",
  ].map((city) => ({
    url: `${baseUrl}/search?city=${city}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...providerPages, ...specialtyPages, ...cityPages];
}
