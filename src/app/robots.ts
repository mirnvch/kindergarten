/**
 * Robots.txt configuration for SEO.
 *
 * Controls which pages search engines can crawl.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

import { type MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Private routes
          "/api/",
          "/dashboard/",
          "/portal/",
          "/admin/",

          // Auth routes (no need to index)
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",

          // Internal routes
          "/_next/",
          "/monitoring",

          // Search with too many params (prevent duplicate content)
          "/search?*page=*",
        ],
      },
      {
        // Block AI crawlers if desired
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
