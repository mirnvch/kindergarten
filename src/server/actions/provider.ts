"use server";

import { db } from "@/lib/db";
import { ProviderStatus, Prisma } from "@prisma/client";

export type SearchFilters = {
  query?: string;
  city?: string;
  state?: string;
  // Medical-specific filters
  specialty?: string;
  insurance?: string;
  telemedicine?: boolean;
  acceptingNewPatients?: boolean;
  // Price filters
  minPrice?: number;
  maxPrice?: number;
  // Rating filter
  minRating?: number;
  // Language filter
  language?: string;
  // Geolocation search
  lat?: number;
  lng?: number;
  radius?: number; // in miles
  page?: number;
  limit?: number;
};

export type ProviderSearchResult = {
  id: string;
  slug: string;
  name: string;
  type: "DOCTOR" | "CLINIC" | "HOSPITAL";
  description: string | null;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  // Medical-specific
  specialty: string | null;
  credentials: string | null;
  languages: string[];
  // Insurance & Pricing
  consultationFee: number | null;
  telehealthFee: number | null;
  acceptedInsurance: string[];
  acceptsMedicaid: boolean;
  acceptsMedicare: boolean;
  // Availability
  offersTelehealth: boolean;
  acceptingNewPatients: boolean;
  averageWaitDays: number | null;
  // Ratings
  rating: number;
  reviewCount: number;
  // Display
  primaryPhoto: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  subscriptionPlan: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  distance?: number; // in miles, only when geolocation search is used
};

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function searchProviders(filters: SearchFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 12;

  const where: Prisma.ProviderWhereInput = {
    status: ProviderStatus.APPROVED,
    deletedAt: null,
  };

  // Location filter (skip if using geolocation)
  if (!filters.lat && !filters.lng) {
    if (filters.city) {
      where.city = { contains: filters.city, mode: "insensitive" };
    }
    if (filters.state) {
      where.state = { equals: filters.state, mode: "insensitive" };
    }
  }

  // Specialty filter
  if (filters.specialty) {
    where.specialty = { contains: filters.specialty, mode: "insensitive" };
  }

  // Insurance filter
  if (filters.insurance) {
    where.acceptedInsurance = { has: filters.insurance };
  }

  // Telemedicine filter
  if (filters.telemedicine) {
    where.offersTelehealth = true;
  }

  // Accepting new patients filter
  if (filters.acceptingNewPatients !== undefined) {
    where.acceptingNewPatients = filters.acceptingNewPatients;
  }

  // Language filter
  if (filters.language) {
    where.languages = { has: filters.language };
  }

  // Price filter (consultation fee)
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.consultationFee = {};
    if (filters.minPrice !== undefined) {
      where.consultationFee.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      where.consultationFee.lte = filters.maxPrice;
    }
  }

  // Text search
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { specialty: { contains: filters.query, mode: "insensitive" } },
      { city: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  // For rating and geolocation filters, we need to fetch more and filter in-memory
  const needsPostFiltering = filters.minRating !== undefined || filters.lat !== undefined;
  const fetchLimit = needsPostFiltering ? 500 : limit;

  const [allProviders, totalBeforeFilter] = await Promise.all([
    db.provider.findMany({
      where,
      take: fetchLimit,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        photos: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: { reviews: true },
        },
        subscription: {
          select: { plan: true, status: true },
        },
      },
    }),
    db.provider.count({ where }),
  ]);

  // Get avg ratings using SQL aggregation
  const providerIds = allProviders.map((p) => p.id);
  const avgRatings =
    providerIds.length > 0
      ? await db.review.groupBy({
          by: ["providerId"],
          where: { providerId: { in: providerIds } },
          _avg: { rating: true },
        })
      : [];

  const ratingMap = new Map(avgRatings.map((r) => [r.providerId, r._avg.rating || 0]));

  // Build results with distance calculation
  let results: (ProviderSearchResult & { _sortPriority: number })[] = allProviders.map((provider) => {
    const avgRating = ratingMap.get(provider.id) || 0;
    const subscriptionPlan =
      provider.subscription?.status === "ACTIVE"
        ? provider.subscription.plan
        : "FREE";

    // Calculate distance if geolocation search
    let distance: number | undefined;
    if (filters.lat !== undefined && filters.lng !== undefined) {
      distance = calculateDistance(
        filters.lat,
        filters.lng,
        provider.latitude,
        provider.longitude
      );
    }

    const planPriority: Record<string, number> = { ENTERPRISE: 4, PROFESSIONAL: 3, STARTER: 2, FREE: 1 };

    return {
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      type: provider.type,
      description: provider.description,
      city: provider.city,
      state: provider.state,
      address: provider.address,
      latitude: provider.latitude,
      longitude: provider.longitude,
      specialty: provider.specialty,
      credentials: provider.credentials,
      languages: provider.languages,
      consultationFee: provider.consultationFee ? Number(provider.consultationFee) : null,
      telehealthFee: provider.telehealthFee ? Number(provider.telehealthFee) : null,
      acceptedInsurance: provider.acceptedInsurance,
      acceptsMedicaid: provider.acceptsMedicaid,
      acceptsMedicare: provider.acceptsMedicare,
      offersTelehealth: provider.offersTelehealth,
      acceptingNewPatients: provider.acceptingNewPatients,
      averageWaitDays: provider.averageWaitDays,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: provider._count.reviews,
      primaryPhoto: provider.photos[0]?.url || null,
      isFeatured: provider.isFeatured,
      isVerified: provider.isVerified,
      subscriptionPlan,
      distance,
      _sortPriority: planPriority[subscriptionPlan] || 1,
    };
  });

  // Apply post-filters
  // Filter by minimum rating
  if (filters.minRating !== undefined) {
    results = results.filter((p) => p.rating >= filters.minRating!);
  }

  // Filter by radius (geolocation)
  if (filters.lat !== undefined && filters.lng !== undefined) {
    const radius = filters.radius || 25; // Default 25 miles
    results = results.filter((p) => p.distance !== undefined && p.distance <= radius);
  }

  // Sort results
  results.sort((a, b) => {
    // If geolocation search, sort by distance first
    if (filters.lat !== undefined && a.distance !== undefined && b.distance !== undefined) {
      // Featured still gets priority but within reasonable distance
      if (a.isFeatured !== b.isFeatured && Math.abs(a.distance - b.distance) < 5) {
        return a.isFeatured ? -1 : 1;
      }
      return a.distance - b.distance;
    }
    // Normal sorting: featured first, then by subscription plan
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return b._sortPriority - a._sortPriority;
  });

  // Calculate total after filtering
  const total = needsPostFiltering ? results.length : totalBeforeFilter;

  // Paginate
  const skip = (page - 1) * limit;
  const paginatedResults = results.slice(skip, skip + limit);

  // Remove internal sorting field
  const finalResults: ProviderSearchResult[] = paginatedResults.map(({ _sortPriority, ...rest }) => rest);

  return {
    providers: finalResults,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProviderBySlug(slug: string) {
  const provider = await db.provider.findUnique({
    where: { slug, status: ProviderStatus.APPROVED, deletedAt: null },
    include: {
      photos: { orderBy: { order: "asc" } },
      services: { where: { isActive: true } },
      facilities: {
        include: { facility: true },
      },
      reviews: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      staff: {
        where: { role: "owner" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!provider) return null;

  const avgRating =
    provider.reviews.length > 0
      ? provider.reviews.reduce((sum, r) => sum + r.rating, 0) /
        provider.reviews.length
      : 0;

  return {
    ...provider,
    consultationFee: provider.consultationFee ? Number(provider.consultationFee) : null,
    telehealthFee: provider.telehealthFee ? Number(provider.telehealthFee) : null,
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: provider.reviews.length,
    facilities: provider.facilities.map((f) => f.facility),
    services: provider.services.map((s) => ({
      ...s,
      price: Number(s.price),
    })),
    owner: provider.staff[0]?.user || null,
  };
}

export async function getFeaturedProviders(limit = 6) {
  const providers = await db.provider.findMany({
    where: {
      status: ProviderStatus.APPROVED,
      isFeatured: true,
      deletedAt: null,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      photos: {
        where: { isPrimary: true },
        take: 1,
      },
      reviews: {
        select: { rating: true },
      },
    },
  });

  return providers.map((provider) => {
    const avgRating =
      provider.reviews.length > 0
        ? provider.reviews.reduce((sum, r) => sum + r.rating, 0) /
          provider.reviews.length
        : 0;

    return {
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      type: provider.type,
      specialty: provider.specialty,
      credentials: provider.credentials,
      city: provider.city,
      state: provider.state,
      consultationFee: provider.consultationFee ? Number(provider.consultationFee) : null,
      offersTelehealth: provider.offersTelehealth,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: provider.reviews.length,
      primaryPhoto: provider.photos[0]?.url || null,
      isVerified: provider.isVerified,
    };
  });
}

// Get unique cities and states for filter dropdowns
export async function getLocations() {
  const locations = await db.provider.findMany({
    where: { status: ProviderStatus.APPROVED, deletedAt: null },
    select: { city: true, state: true },
    distinct: ["city", "state"],
    orderBy: [{ state: "asc" }, { city: "asc" }],
  });

  const states = [...new Set(locations.map((l) => l.state))];
  const citiesByState = locations.reduce(
    (acc, l) => {
      if (!acc[l.state]) acc[l.state] = [];
      if (!acc[l.state].includes(l.city)) acc[l.state].push(l.city);
      return acc;
    },
    {} as Record<string, string[]>
  );

  return { states, citiesByState };
}

// Get unique specialties for filter dropdown
export async function getSpecialties() {
  const specialties = await db.provider.findMany({
    where: { status: ProviderStatus.APPROVED, deletedAt: null, specialty: { not: null } },
    select: { specialty: true },
    distinct: ["specialty"],
    orderBy: { specialty: "asc" },
  });

  return specialties
    .map((s) => s.specialty)
    .filter((s): s is string => s !== null);
}

// Get unique accepted insurances for filter dropdown
export async function getAcceptedInsurances() {
  const providers = await db.provider.findMany({
    where: { status: ProviderStatus.APPROVED, deletedAt: null },
    select: { acceptedInsurance: true },
  });

  const allInsurances = providers.flatMap((p) => p.acceptedInsurance);
  const uniqueInsurances = [...new Set(allInsurances)].sort();

  return uniqueInsurances;
}

// Get unique languages for filter dropdown
export async function getLanguages() {
  const providers = await db.provider.findMany({
    where: { status: ProviderStatus.APPROVED, deletedAt: null },
    select: { languages: true },
  });

  const allLanguages = providers.flatMap((p) => p.languages);
  const uniqueLanguages = [...new Set(allLanguages)].sort();

  return uniqueLanguages;
}
