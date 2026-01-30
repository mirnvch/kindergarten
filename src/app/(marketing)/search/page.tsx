import { Metadata } from "next";
import { Suspense } from "react";

import { searchDaycares, type SearchFilters } from "@/server/actions/daycare";
import { SearchResultsClient } from "@/components/search/search-results";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Find Daycare | KinderCare",
  description:
    "Search and find the perfect daycare for your child. Filter by location, price, and age group.",
};

interface SearchPageProps {
  searchParams: Promise<{
    query?: string;
    city?: string;
    state?: string;
    minPrice?: string;
    maxPrice?: string;
    minAge?: string;
    maxAge?: string;
    minRating?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    page?: string;
  }>;
}

function SearchSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function SearchContent({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const filters: SearchFilters = {
    query: params.query,
    city: params.city,
    state: params.state,
    minPrice: params.minPrice ? parseInt(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseInt(params.maxPrice) : undefined,
    minAge: params.minAge ? parseInt(params.minAge) : undefined,
    maxAge: params.maxAge ? parseInt(params.maxAge) : undefined,
    minRating: params.minRating ? parseFloat(params.minRating) : undefined,
    lat: params.lat ? parseFloat(params.lat) : undefined,
    lng: params.lng ? parseFloat(params.lng) : undefined,
    radius: params.radius ? parseFloat(params.radius) : undefined,
    page: params.page ? parseInt(params.page) : 1,
  };

  const { daycares, pagination } = await searchDaycares(filters);

  // Convert filters to serializable format for client component
  const serializableFilters: Record<string, string | number | undefined> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      serializableFilters[key] = value;
    }
  });

  return (
    <SearchResultsClient
      daycares={daycares}
      pagination={pagination}
      filters={serializableFilters}
    />
  );
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Daycare</h1>
        <p className="text-muted-foreground">
          Search for trusted daycare providers in your area
        </p>
      </div>

      <Suspense fallback={<SearchSkeleton />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
