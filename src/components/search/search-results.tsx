"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { SearchFilters } from "./search-filters";
import { SaveSearchButton } from "./save-search-button";
import { DaycareCard } from "@/components/daycare/daycare-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DaycareSearchResult } from "@/server/actions/daycare";

// Loading skeleton for search results
export function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for search filters (prevents hydration mismatch)
function SearchFiltersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-20 hidden sm:block" />
      </div>
      <div className="hidden lg:flex gap-4">
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>
    </div>
  );
}

// Dynamic import for SearchMap (Mapbox GL is heavy ~200KB)
// Only loaded when user switches to map view
const SearchMap = dynamic(
  () => import("./search-map").then((mod) => mod.SearchMap),
  {
    loading: () => (
      <div className="aspect-[4/3] w-full rounded-lg bg-muted flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false, // Mapbox GL doesn't support SSR
  }
);

interface SearchResultsClientProps {
  daycares: DaycareSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: Record<string, string | number | boolean | undefined>;
}

export function SearchResultsClient({
  daycares,
  pagination,
  filters,
}: SearchResultsClientProps) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <>
      <div className="mb-8">
        {/* Wrap SearchFilters in Suspense to prevent hydration mismatch from useSearchParams */}
        <Suspense fallback={<SearchFiltersSkeleton />}>
          <SearchFilters onViewChange={setView} currentView={view} />
        </Suspense>
      </div>

      {daycares.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">No providers found</h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your filters or search for a different location.
          </p>
          <Button asChild className="mt-4">
            <Link href="/search">Clear filters</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground">
              {pagination.total} provider{pagination.total !== 1 ? "s" : ""} found
            </p>
            {/* Wrap SaveSearchButton in Suspense to prevent hydration mismatch from useSearchParams */}
            <Suspense fallback={<Skeleton className="h-9 w-28" />}>
              <SaveSearchButton />
            </Suspense>
          </div>

          {view === "list" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {daycares.map((daycare) => (
                <DaycareCard key={daycare.id} daycare={daycare} />
              ))}
            </div>
          ) : (
            <SearchMap daycares={daycares} />
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && view === "list" && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                asChild={pagination.page > 1}
              >
                {pagination.page > 1 ? (
                  <Link
                    href={{
                      pathname: "/search",
                      query: {
                        ...filters,
                        page: pagination.page - 1,
                      },
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Link>
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </>
                )}
              </Button>

              <span className="text-sm text-muted-foreground px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                asChild={pagination.page < pagination.totalPages}
              >
                {pagination.page < pagination.totalPages ? (
                  <Link
                    href={{
                      pathname: "/search",
                      query: {
                        ...filters,
                        page: pagination.page + 1,
                      },
                    }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
