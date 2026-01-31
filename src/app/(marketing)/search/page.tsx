import { Metadata } from "next";
import { Suspense } from "react";

import { searchDaycares } from "@/server/actions/daycare";
import { SearchResultsClient } from "@/components/search/search-results";
import { Skeleton } from "@/components/ui/skeleton";
import {
  publicSearchSchema,
  parseSearchParams,
} from "@/lib/validations";

export const metadata: Metadata = {
  title: "Find Daycare | KinderCare",
  description:
    "Search and find the perfect daycare for your child. Filter by location, price, and age group.",
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const rawParams = await searchParams;
  const filters = parseSearchParams(publicSearchSchema, rawParams);

  const { daycares, pagination } = await searchDaycares(filters);

  // Convert filters to serializable format for client component
  const serializableFilters: Record<string, string | number | undefined> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) {
      serializableFilters[key] = value;
    }
  }

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
