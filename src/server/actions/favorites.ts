"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FavoriteItem } from "@/types";

export async function toggleFavorite(providerId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  // Check if favorite exists
  const existing = await db.favorite.findUnique({
    where: {
      userId_providerId: {
        userId: session.user.id,
        providerId,
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
        providerId,
      },
    });
    revalidatePath("/dashboard/favorites");
    return { favorited: true };
  }
}

export async function getFavorites(): Promise<FavoriteItem[]> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    throw new Error("Unauthorized");
  }

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      provider: {
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
      fav.provider.reviews.length > 0
        ? fav.provider.reviews.reduce((sum, r) => sum + r.rating, 0) /
          fav.provider.reviews.length
        : null;

    return {
      id: fav.id,
      createdAt: fav.createdAt,
      provider: {
        id: fav.provider.id,
        name: fav.provider.name,
        slug: fav.provider.slug,
        address: fav.provider.address,
        city: fav.provider.city,
        state: fav.provider.state,
        specialty: fav.provider.specialty,
        credentials: fav.provider.credentials,
        consultationFee: fav.provider.consultationFee,
        offersTelehealth: fav.provider.offersTelehealth,
        photo: fav.provider.photos[0]?.url || null,
        rating: avgRating,
        reviewCount: fav.provider.reviews.length,
      },
    };
  });
}

export async function isFavorited(providerId: string) {
  const session = await auth();
  if (!session?.user) {
    return false;
  }

  const favorite = await db.favorite.findUnique({
    where: {
      userId_providerId: {
        userId: session.user.id,
        providerId,
      },
    },
  });

  return !!favorite;
}
