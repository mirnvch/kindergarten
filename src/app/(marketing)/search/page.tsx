import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { searchDaycares, type SearchFilters, type DaycareSearchResult } from "@/server/actions/daycare";
import { SearchFilters as SearchFiltersComponent } from "@/components/search/search-filters";
import { DaycareCard } from "@/components/daycare/daycare-card";
import { Button } from "@/components/ui/button";
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
    page?: string;
  }>;
}

function SearchResultsSkeleton() {
  return (
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
  );
}

async function SearchResults({ filters }: { filters: SearchFilters }) {
  const { daycares, pagination } = await searchDaycares(filters);

  if (daycares.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">No daycares found</h3>
        <p className="text-muted-foreground mt-2">
          Try adjusting your filters or search for a different location.
        </p>
        <Button asChild className="mt-4">
          <Link href="/search">Clear filters</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground">
          {pagination.total} daycare{pagination.total !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {daycares.map((daycare: DaycareSearchResult) => (
          <DaycareCard key={daycare.id} daycare={daycare} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
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
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const filters: SearchFilters = {
    query: params.query,
    city: params.city,
    state: params.state,
    minPrice: params.minPrice ? parseInt(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseInt(params.maxPrice) : undefined,
    minAge: params.minAge ? parseInt(params.minAge) : undefined,
    maxAge: params.maxAge ? parseInt(params.maxAge) : undefined,
    page: params.page ? parseInt(params.page) : 1,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Daycare</h1>
        <p className="text-muted-foreground">
          Search for trusted daycare providers in your area
        </p>
      </div>

      <div className="mb-8">
        <Suspense fallback={<Skeleton className="h-10 w-full" />}>
          <SearchFiltersComponent />
        </Suspense>
      </div>

      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults filters={filters} />
      </Suspense>
    </div>
  );
}
