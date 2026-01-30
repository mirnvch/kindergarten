import type { SearchFiltersData } from "@/server/actions/saved-searches";

// Helper to build URL from saved filters
export function buildSearchUrl(filters: SearchFiltersData): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}
