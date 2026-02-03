import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Search, ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { getSavedSearches } from "@/server/actions/saved-searches";
import { buildSearchUrl } from "@/lib/search-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteSavedSearchButton } from "@/components/search/delete-saved-search-button";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = {
  title: "Saved Searches | KinderCare",
  description: "View and manage your saved daycare searches",
};

export default async function SavedSearchesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const savedSearches = await getSavedSearches();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Saved Searches</h1>
          <p className="text-muted-foreground">
            Quickly access your favorite search filters
          </p>
        </div>
        <Button asChild>
          <Link href="/search">
            <Search className="h-4 w-4 mr-2" />
            New Search
          </Link>
        </Button>
      </div>

      {savedSearches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved searches yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Save your search filters to quickly find daycares that match your
              criteria.
            </p>
            <Button asChild>
              <Link href="/search">Start Searching</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedSearches.map((search) => (
            <SavedSearchCard key={search.id} search={search} />
          ))}
        </div>
      )}

      {savedSearches.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          You can save up to 10 searches. Currently using {savedSearches.length}/10.
        </p>
      )}
    </div>
  );
}

interface SavedSearchCardProps {
  search: {
    id: string;
    name: string;
    filters: {
      query?: string;
      city?: string;
      state?: string;
      minPrice?: number;
      maxPrice?: number;
      minAge?: number;
      maxAge?: number;
      minRating?: number;
      lat?: number;
      lng?: number;
      radius?: number;
    };
    createdAt: Date;
  };
}

function SavedSearchCard({ search }: SavedSearchCardProps) {
  const searchUrl = buildSearchUrl(search.filters);
  const filterSummary = getFilterSummary(search.filters);

  return (
    <Card className="group relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="truncate pr-8">{search.name}</span>
        </CardTitle>
        <CardDescription>
          Saved {formatDistanceToNow(new Date(search.createdAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          {filterSummary.map((filter, i) => (
            <p key={i}>{filter}</p>
          ))}
        </div>

        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={searchUrl}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Use Search
            </Link>
          </Button>
          <DeleteSavedSearchButton searchId={search.id} searchName={search.name} />
        </div>
      </CardContent>
    </Card>
  );
}

function getFilterSummary(filters: SavedSearchCardProps["search"]["filters"]): string[] {
  const summary: string[] = [];

  if (filters.query) {
    summary.push(`Search: "${filters.query}"`);
  }

  if (filters.city || filters.state) {
    const location = [filters.city, filters.state].filter(Boolean).join(", ");
    summary.push(`Location: ${location}`);
  }

  if (filters.lat && filters.lng) {
    summary.push(`Near you (${filters.radius || 10} miles)`);
  }

  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice || 0;
    const max = filters.maxPrice ? `$${filters.maxPrice}` : "any";
    summary.push(`Price: $${min} - ${max}`);
  }

  if (filters.minAge || filters.maxAge) {
    const min = filters.minAge || 0;
    const max = filters.maxAge || "any";
    summary.push(`Age: ${min} - ${max} months`);
  }

  if (filters.minRating) {
    summary.push(`Rating: ${filters.minRating}+ stars`);
  }

  if (summary.length === 0) {
    summary.push("All daycares");
  }

  return summary;
}
