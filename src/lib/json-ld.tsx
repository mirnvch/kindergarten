/**
 * JSON-LD Structured Data helpers for rich search results.
 *
 * Implements Schema.org vocabulary for better search engine understanding.
 * @see https://schema.org
 * @see https://developers.google.com/search/docs/appearance/structured-data
 *
 * @example
 * // In a page component
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: JSON.stringify(createOrganizationLD()) }}
 * />
 */

import { siteConfig } from "@/config/site";

// ─────────────────────────────────────────────────────────────────────────────
// Types (simplified Schema.org types)
// ─────────────────────────────────────────────────────────────────────────────

interface Thing {
  "@type": string;
  name: string;
  description?: string;
  url?: string;
  image?: string | string[];
}

interface Organization extends Thing {
  "@type": "Organization" | "MedicalOrganization";
  logo?: string;
  sameAs?: string[];
  contactPoint?: {
    "@type": "ContactPoint";
    telephone?: string;
    contactType: string;
    availableLanguage?: string[];
  };
}

interface LocalBusiness extends Thing {
  "@type": "Physician" | "MedicalClinic" | "Hospital" | "LocalBusiness";
  address: {
    "@type": "PostalAddress";
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  priceRange?: string;
  openingHoursSpecification?: {
    "@type": "OpeningHoursSpecification";
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }[];
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  medicalSpecialty?: string[];
}

interface BreadcrumbList {
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }[];
}

interface FAQPage {
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }[];
}

interface WebSite {
  "@type": "WebSite";
  name: string;
  url: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: {
      "@type": "EntryPoint";
      urlTemplate: string;
    };
    "query-input": string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD Creators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Organization structured data for the site.
 */
export function createOrganizationLD(): Organization & { "@context": string } {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [siteConfig.links.twitter, siteConfig.links.facebook, siteConfig.links.instagram],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
  };
}

/**
 * Create WebSite structured data with search action.
 */
export function createWebSiteLD(): WebSite & { "@context": string } {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Create Provider (Physician/Clinic) structured data.
 */
export function createProviderLD(provider: {
  name: string;
  description?: string;
  slug: string;
  type: "DOCTOR" | "CLINIC" | "HOSPITAL";
  specialty?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  openingTime?: string;
  closingTime?: string;
  operatingDays?: string[];
  rating?: number;
  reviewCount?: number;
  image?: string;
}): LocalBusiness & { "@context": string } {
  const typeMap = {
    DOCTOR: "Physician",
    CLINIC: "MedicalClinic",
    HOSPITAL: "Hospital",
  } as const;

  const dayMap: Record<string, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };

  return {
    "@context": "https://schema.org",
    "@type": typeMap[provider.type] ?? "Physician",
    name: provider.name,
    description: provider.description,
    url: `${siteConfig.url}/providers/${provider.slug}`,
    image: provider.image,
    address: {
      "@type": "PostalAddress",
      streetAddress: provider.address,
      addressLocality: provider.city,
      addressRegion: provider.state,
      postalCode: provider.zipCode,
      addressCountry: provider.country ?? "US",
    },
    ...(provider.latitude &&
      provider.longitude && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: provider.latitude,
          longitude: provider.longitude,
        },
      }),
    telephone: provider.phone,
    ...(provider.specialty && {
      medicalSpecialty: [provider.specialty],
    }),
    ...(provider.openingTime &&
      provider.closingTime &&
      provider.operatingDays && {
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: provider.operatingDays.map((d) => dayMap[d] ?? d),
            opens: provider.openingTime,
            closes: provider.closingTime,
          },
        ],
      }),
    ...(provider.rating &&
      provider.reviewCount && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: provider.rating,
          reviewCount: provider.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
  };
}

/**
 * Create Breadcrumb structured data.
 */
export function createBreadcrumbLD(
  items: { name: string; url?: string }[]
): BreadcrumbList & { "@context": string } {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };
}

/**
 * Create FAQ structured data.
 */
export function createFAQLD(
  faqs: { question: string; answer: string }[]
): FAQPage & { "@context": string } {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render JSON-LD script tag.
 * Use in Server Components.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
