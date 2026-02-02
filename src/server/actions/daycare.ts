"use server";

import { db } from "@/lib/db";
import { DaycareStatus, Prisma } from "@prisma/client";

export type SearchFilters = {
  query?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minAge?: number; // in months
  maxAge?: number; // in months
  minRating?: number;
  amenities?: string[];
  // Geolocation search
  lat?: number;
  lng?: number;
  radius?: number; // in miles
  page?: number;
  limit?: number;
};

export type DaycareSearchResult = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerMonth: number;
  minAge: number;
  maxAge: number;
  capacity: number;
  rating: number;
  reviewCount: number;
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

export async function searchDaycares(filters: SearchFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 12;

  const where: Prisma.DaycareWhereInput = {
    status: DaycareStatus.APPROVED,
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

  // Price filter
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.pricePerMonth = {};
    if (filters.minPrice !== undefined) {
      where.pricePerMonth.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      where.pricePerMonth.lte = filters.maxPrice;
    }
  }

  // Age filter (child age must be within daycare's range)
  if (filters.minAge !== undefined) {
    where.maxAge = { gte: filters.minAge };
  }
  if (filters.maxAge !== undefined) {
    where.minAge = { lte: filters.maxAge };
  }

  // Text search
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { city: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  // Amenities filter
  if (filters.amenities && filters.amenities.length > 0) {
    where.amenities = {
      some: {
        amenity: {
          name: { in: filters.amenities },
        },
      },
    };
  }

  // For rating and geolocation filters, we need to fetch more and filter in-memory
  const needsPostFiltering = filters.minRating !== undefined || filters.lat !== undefined;
  const fetchLimit = needsPostFiltering ? 500 : limit; // Fetch more for post-filtering

  const [allDaycares, totalBeforeFilter] = await Promise.all([
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
  const daycareIds = allDaycares.map((d) => d.id);
  const avgRatings =
    daycareIds.length > 0
      ? await db.review.groupBy({
          by: ["daycareId"],
          where: { daycareId: { in: daycareIds } },
          _avg: { rating: true },
        })
      : [];

  const ratingMap = new Map(avgRatings.map((r) => [r.daycareId, r._avg.rating || 0]));

  // Build results with distance calculation
  let results: (DaycareSearchResult & { _sortPriority: number })[] = allDaycares.map((daycare) => {
    const avgRating = ratingMap.get(daycare.id) || 0;
    const subscriptionPlan =
      daycare.subscription?.status === "ACTIVE"
        ? daycare.subscription.plan
        : "FREE";

    // Calculate distance if geolocation search
    let distance: number | undefined;
    if (filters.lat !== undefined && filters.lng !== undefined) {
      distance = calculateDistance(
        filters.lat,
        filters.lng,
        daycare.latitude,
        daycare.longitude
      );
    }

    const planPriority: Record<string, number> = { ENTERPRISE: 4, PROFESSIONAL: 3, STARTER: 2, FREE: 1 };

    return {
      id: daycare.id,
      slug: daycare.slug,
      name: daycare.name,
      description: daycare.description,
      city: daycare.city,
      state: daycare.state,
      address: daycare.address,
      latitude: daycare.latitude,
      longitude: daycare.longitude,
      pricePerMonth: Number(daycare.pricePerMonth),
      minAge: daycare.minAge,
      maxAge: daycare.maxAge,
      capacity: daycare.capacity,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: daycare._count.reviews,
      primaryPhoto: daycare.photos[0]?.url || null,
      isFeatured: daycare.isFeatured,
      isVerified: daycare.isVerified,
      subscriptionPlan,
      distance,
      _sortPriority: planPriority[subscriptionPlan] || 1,
    };
  });

  // Apply post-filters
  // Filter by minimum rating
  if (filters.minRating !== undefined) {
    results = results.filter((d) => d.rating >= filters.minRating!);
  }

  // Filter by radius (geolocation)
  if (filters.lat !== undefined && filters.lng !== undefined) {
    const radius = filters.radius || 25; // Default 25 miles
    results = results.filter((d) => d.distance !== undefined && d.distance <= radius);
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
  const finalResults: DaycareSearchResult[] = paginatedResults.map(({ _sortPriority, ...rest }) => rest);

  return {
    daycares: finalResults,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDaycareBySlug(slug: string) {
  const daycare = await db.provider.findUnique({
    where: { slug, status: DaycareStatus.APPROVED, deletedAt: null },
    include: {
      photos: { orderBy: { order: "asc" } },
      programs: true,
      amenities: {
        include: { amenity: true },
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

  if (!daycare) return null;

  const avgRating =
    daycare.reviews.length > 0
      ? daycare.reviews.reduce((sum, r) => sum + r.rating, 0) /
        daycare.reviews.length
      : 0;

  return {
    ...daycare,
    pricePerMonth: Number(daycare.pricePerMonth),
    pricePerWeek: daycare.pricePerWeek ? Number(daycare.pricePerWeek) : null,
    pricePerDay: daycare.pricePerDay ? Number(daycare.pricePerDay) : null,
    registrationFee: daycare.registrationFee
      ? Number(daycare.registrationFee)
      : null,
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: daycare.reviews.length,
    amenities: daycare.amenities.map((a) => a.amenity),
    programs: daycare.programs.map((p) => ({
      ...p,
      price: Number(p.price),
    })),
    owner: daycare.staff[0]?.user || null,
  };
}

export async function getFeaturedDaycares(limit = 6) {
  const daycares = await db.provider.findMany({
    where: {
      status: DaycareStatus.APPROVED,
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

  return daycares.map((daycare) => {
    const avgRating =
      daycare.reviews.length > 0
        ? daycare.reviews.reduce((sum, r) => sum + r.rating, 0) /
          daycare.reviews.length
        : 0;

    return {
      id: daycare.id,
      slug: daycare.slug,
      name: daycare.name,
      city: daycare.city,
      state: daycare.state,
      pricePerMonth: Number(daycare.pricePerMonth),
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: daycare.reviews.length,
      primaryPhoto: daycare.photos[0]?.url || null,
      isVerified: daycare.isVerified,
    };
  });
}

// Get unique cities and states for filter dropdowns
export async function getLocations() {
  const locations = await db.provider.findMany({
    where: { status: DaycareStatus.APPROVED, deletedAt: null },
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
