"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSearch, type SearchFiltersData } from "@/server/actions/saved-searches";
import { toast } from "sonner";

export function SaveSearchButton() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if there are any active filters
  const hasFilters = Array.from(searchParams.entries()).some(
    ([key, value]) => key !== "page" && value
  );

  if (!session?.user) {
    return null;
  }

  if (!hasFilters) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this search");
      return;
    }

    setIsLoading(true);

    // Build filters object from search params
    const filters: SearchFiltersData = {};

    const query = searchParams.get("query");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minAge = searchParams.get("minAge");
    const maxAge = searchParams.get("maxAge");
    const minRating = searchParams.get("minRating");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");

    if (query) filters.query = query;
    if (city) filters.city = city;
    if (state) filters.state = state;
    if (minPrice) filters.minPrice = parseInt(minPrice);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice);
    if (minAge) filters.minAge = parseInt(minAge);
    if (maxAge) filters.maxAge = parseInt(maxAge);
    if (minRating) filters.minRating = parseFloat(minRating);
    if (lat) filters.lat = parseFloat(lat);
    if (lng) filters.lng = parseFloat(lng);
    if (radius) filters.radius = parseFloat(radius);

    try {
      const result = await saveSearch(name.trim(), filters);

      if (result.success) {
        toast.success("Search saved successfully");
        setOpen(false);
        setName("");
      } else {
        toast.error(result.error || "Failed to save search");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a default name based on filters
  const getDefaultName = () => {
    const parts: string[] = [];

    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const query = searchParams.get("query");

    if (query) parts.push(query);
    if (city) parts.push(city);
    if (state) parts.push(state);

    if (parts.length === 0) {
      const minRating = searchParams.get("minRating");
      if (minRating) parts.push(`${minRating}+ stars`);
    }

    return parts.length > 0 ? parts.join(", ") : "My Search";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setName(getDefaultName())}
        >
          <Bookmark className="h-4 w-4" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
          <DialogDescription>
            Save your current search filters to quickly access them later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              placeholder="e.g., Providers near home"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>

          {/* Show active filters */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Active filters:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {searchParams.get("query") && (
                <li>Search: {searchParams.get("query")}</li>
              )}
              {searchParams.get("city") && (
                <li>City: {searchParams.get("city")}</li>
              )}
              {searchParams.get("state") && (
                <li>State: {searchParams.get("state")}</li>
              )}
              {(searchParams.get("minPrice") || searchParams.get("maxPrice")) && (
                <li>
                  Price: ${searchParams.get("minPrice") || "0"} - $
                  {searchParams.get("maxPrice") || "any"}
                </li>
              )}
              {searchParams.get("minRating") && (
                <li>Rating: {searchParams.get("minRating")}+ stars</li>
              )}
              {searchParams.get("lat") && (
                <li>Location: Near you ({searchParams.get("radius") || "10"} miles)</li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
