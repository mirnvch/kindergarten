"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FavoriteItem } from "@/types";

export async function toggleFavorite(daycareId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  // Check if favorite exists
  const existing = await db.favorite.findUnique({
    where: {
      userId_daycareId: {
        userId: session.user.id,
        daycareId,
      },
    },
  });

  if (existing) {
    // Remove from favorites
    await db.favorite.delete({
      where: { id: existing.id },
    });
    revalidatePath("/dashboard/favorites");
    return { favorited: false };
  } else {
    // Add to favorites
    await db.favorite.create({
      data: {
        userId: session.user.id,
        daycareId,
      },
    });
    revalidatePath("/dashboard/favorites");
    return { favorited: true };
  }
}

export async function getFavorites(): Promise<FavoriteItem[]> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      daycare: {
        include: {
          photos: {
            where: { isPrimary: true },
            take: 1,
          },
          reviews: {
            select: { rating: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites.map((fav) => {
    const avgRating =
      fav.daycare.reviews.length > 0
        ? fav.daycare.reviews.reduce((sum, r) => sum + r.rating, 0) /
          fav.daycare.reviews.length
        : null;

    return {
      id: fav.id,
      createdAt: fav.createdAt,
      daycare: {
        id: fav.daycare.id,
        name: fav.daycare.name,
        slug: fav.daycare.slug,
        address: fav.daycare.address,
        city: fav.daycare.city,
        state: fav.daycare.state,
        pricePerMonth: fav.daycare.pricePerMonth,
        minAge: fav.daycare.minAge,
        maxAge: fav.daycare.maxAge,
        photo: fav.daycare.photos[0]?.url || null,
        rating: avgRating,
        reviewCount: fav.daycare.reviews.length,
      },
    };
  });
}

export async function isFavorited(daycareId: string) {
  const session = await auth();
  if (!session?.user) {
    return false;
  }

  const favorite = await db.favorite.findUnique({
    where: {
      userId_daycareId: {
        userId: session.user.id,
        daycareId,
      },
    },
  });

  return !!favorite;
}
