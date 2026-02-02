"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, MapPin, Loader2 } from "lucide-react";

import { SearchFilters } from "./search-filters";
import { SaveSearchButton } from "./save-search-button";
import { DaycareCard } from "@/components/daycare/daycare-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DaycareSearchResult } from "@/server/actions/daycare";

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
        <SearchFilters onViewChange={setView} currentView={view} />
      </div>

      {daycares.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">No daycares found</h3>
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
              {pagination.total} daycare{pagination.total !== 1 ? "s" : ""} found
            </p>
            <SaveSearchButton />
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
