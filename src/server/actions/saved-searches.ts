"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema for search filters
const searchFiltersSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minAge: z.number().optional(),
  maxAge: z.number().optional(),
  minRating: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(),
});

const saveSearchSchema = z.object({
  name: z.string().min(1).max(100),
  filters: searchFiltersSchema,
});

export type SearchFiltersData = z.infer<typeof searchFiltersSchema>;

const MAX_SAVED_SEARCHES = 10; // Limit per user

export async function saveSearch(name: string, filters: SearchFiltersData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const validation = saveSearchSchema.safeParse({ name, filters });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    // Check existing count
    const existingCount = await db.savedSearch.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= MAX_SAVED_SEARCHES) {
      return {
        success: false,
        error: `Maximum ${MAX_SAVED_SEARCHES} saved searches allowed. Please delete one first.`,
      };
    }

    // Check for duplicate name
    const existing = await db.savedSearch.findFirst({
      where: {
        userId: session.user.id,
        name: validation.data.name,
      },
    });

    if (existing) {
      return { success: false, error: "A search with this name already exists" };
    }

    // Create saved search
    const savedSearch = await db.savedSearch.create({
      data: {
        userId: session.user.id,
        name: validation.data.name,
        filters: validation.data.filters,
      },
    });

    revalidatePath("/dashboard/saved-searches");

    return { success: true, data: savedSearch };
  } catch (error) {
    console.error("Error saving search:", error);
    return { success: false, error: "Failed to save search" };
  }
}

export async function getSavedSearches() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const searches = await db.savedSearch.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return searches.map((search) => ({
      id: search.id,
      name: search.name,
      filters: search.filters as SearchFiltersData,
      createdAt: search.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching saved searches:", error);
    return [];
  }
}

export async function deleteSavedSearch(searchId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Verify ownership
    const search = await db.savedSearch.findFirst({
      where: {
        id: searchId,
        userId: session.user.id,
      },
    });

    if (!search) {
      return { success: false, error: "Search not found" };
    }

    await db.savedSearch.delete({
      where: { id: searchId },
    });

    revalidatePath("/dashboard/saved-searches");

    return { success: true };
  } catch (error) {
    console.error("Error deleting saved search:", error);
    return { success: false, error: "Failed to delete search" };
  }
}

export async function updateSavedSearch(
  searchId: string,
  data: { name?: string; filters?: SearchFiltersData }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Verify ownership
    const search = await db.savedSearch.findFirst({
      where: {
        id: searchId,
        userId: session.user.id,
      },
    });

    if (!search) {
      return { success: false, error: "Search not found" };
    }

    // Check for duplicate name if updating name
    if (data.name && data.name !== search.name) {
      const existing = await db.savedSearch.findFirst({
        where: {
          userId: session.user.id,
          name: data.name,
          id: { not: searchId },
        },
      });

      if (existing) {
        return { success: false, error: "A search with this name already exists" };
      }
    }

    const updated = await db.savedSearch.update({
      where: { id: searchId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.filters && { filters: data.filters }),
      },
    });

    revalidatePath("/dashboard/saved-searches");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating saved search:", error);
    return { success: false, error: "Failed to update search" };
  }
}

