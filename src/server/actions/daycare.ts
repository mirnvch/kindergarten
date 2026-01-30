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
  amenities?: string[];
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
};

export async function searchDaycares(filters: SearchFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const skip = (page - 1) * limit;

  const where: Prisma.DaycareWhereInput = {
    status: DaycareStatus.APPROVED,
    deletedAt: null,
  };

  // Location filter
  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (filters.state) {
    where.state = { equals: filters.state, mode: "insensitive" };
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

  const [daycares, total] = await Promise.all([
    db.daycare.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        photos: {
          where: { isPrimary: true },
          take: 1,
        },
        // Use _count instead of fetching all reviews
        _count: {
          select: { reviews: true },
        },
        subscription: {
          select: { plan: true, status: true },
        },
      },
    }),
    db.daycare.count({ where }),
  ]);

  // Get avg ratings using SQL aggregation (much more efficient)
  const daycareIds = daycares.map((d) => d.id);
  const avgRatings =
    daycareIds.length > 0
      ? await db.review.groupBy({
          by: ["daycareId"],
          where: { daycareId: { in: daycareIds } },
          _avg: { rating: true },
        })
      : [];

  const ratingMap = new Map(avgRatings.map((r) => [r.daycareId, r._avg.rating || 0]));

  // Sort by subscription plan priority (ENTERPRISE > PROFESSIONAL > STARTER > FREE)
  const planPriority = { ENTERPRISE: 4, PROFESSIONAL: 3, STARTER: 2, FREE: 1 };
  daycares.sort((a, b) => {
    // Featured first
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    // Then by subscription plan
    const aPlan = a.subscription?.status === "ACTIVE" ? a.subscription.plan : "FREE";
    const bPlan = b.subscription?.status === "ACTIVE" ? b.subscription.plan : "FREE";
    return (planPriority[bPlan] || 1) - (planPriority[aPlan] || 1);
  });

  const results: DaycareSearchResult[] = daycares.map((daycare) => {
    // Get pre-computed avg rating from SQL aggregation
    const avgRating = ratingMap.get(daycare.id) || 0;

    const subscriptionPlan =
      daycare.subscription?.status === "ACTIVE"
        ? daycare.subscription.plan
        : "FREE";

    return {
      id: daycare.id,
      slug: daycare.slug,
      name: daycare.name,
      description: daycare.description,
      city: daycare.city,
      state: daycare.state,
      address: daycare.address,
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
    };
  });

  return {
    daycares: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDaycareBySlug(slug: string) {
  const daycare = await db.daycare.findUnique({
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
  const daycares = await db.daycare.findMany({
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
  const locations = await db.daycare.findMany({
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
