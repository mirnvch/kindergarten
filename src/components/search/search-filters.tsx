"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useMemo } from "react";
import { Search, SlidersHorizontal, MapPin, List, Map, Star, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const PRICE_RANGES = [
  { value: "0-500", label: "Under $500/mo" },
  { value: "500-1000", label: "$500 - $1,000/mo" },
  { value: "1000-1500", label: "$1,000 - $1,500/mo" },
  { value: "1500-2000", label: "$1,500 - $2,000/mo" },
  { value: "2000-", label: "$2,000+/mo" },
];

const AGE_RANGES = [
  { value: "0-12", label: "Infant (0-12 months)" },
  { value: "12-24", label: "Toddler (1-2 years)" },
  { value: "24-36", label: "2-3 years" },
  { value: "36-48", label: "3-4 years" },
  { value: "48-60", label: "4-5 years" },
  { value: "60-", label: "5+ years" },
];

const RATING_OPTIONS = [
  { value: "4", label: "4+ stars" },
  { value: "3", label: "3+ stars" },
  { value: "2", label: "2+ stars" },
];

interface SearchFiltersProps {
  onViewChange?: (view: "list" | "map") => void;
  currentView?: "list" | "map";
}

export function SearchFilters({ onViewChange, currentView = "list" }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLocating, setIsLocating] = useState(false);

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });

      // Reset to page 1 when filters change
      if (!params.page) {
        newParams.delete("page");
      }

      return newParams.toString();
    },
    [searchParams]
  );

  const updateFilters = (params: Record<string, string | null>) => {
    router.push(`/search?${createQueryString(params)}`);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("query") as string;
    updateFilters({ query: query || null });
  };

  const handlePriceChange = (value: string) => {
    if (value === "all") {
      updateFilters({ minPrice: null, maxPrice: null });
      return;
    }
    const [min, max] = value.split("-");
    updateFilters({
      minPrice: min || null,
      maxPrice: max || null,
    });
  };

  const handleAgeChange = (value: string) => {
    if (value === "all") {
      updateFilters({ minAge: null, maxAge: null });
      return;
    }
    const [min, max] = value.split("-");
    updateFilters({
      minAge: min || null,
      maxAge: max || null,
    });
  };

  const handleRatingChange = (value: string) => {
    updateFilters({ minRating: value === "all" ? null : value });
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateFilters({
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
          radius: "10", // 10 miles
        });
        setIsLocating(false);
      },
      () => {
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  const currentQuery = searchParams.get("query") || "";
  const currentState = searchParams.get("state") || "";
  const currentCity = searchParams.get("city") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentMinAge = searchParams.get("minAge") || "";
  const currentMaxAge = searchParams.get("maxAge") || "";
  const currentMinRating = searchParams.get("minRating") || "";
  const currentLat = searchParams.get("lat");
  const currentLng = searchParams.get("lng");

  const priceValue =
    currentMinPrice || currentMaxPrice
      ? `${currentMinPrice}-${currentMaxPrice}`
      : "all";

  const ageValue =
    currentMinAge || currentMaxAge
      ? `${currentMinAge}-${currentMaxAge}`
      : "all";

  const hasActiveFilters =
    currentQuery ||
    currentState ||
    currentCity ||
    currentMinPrice ||
    currentMaxPrice ||
    currentMinAge ||
    currentMaxAge ||
    currentMinRating ||
    currentLat;

  const filterControls = useMemo(() => (
    <div className="space-y-4">
      <div>
        <Label>State</Label>
        <Select
          value={currentState || "all"}
          onValueChange={(value) =>
            updateFilters({
              state: value === "all" ? null : value,
              city: null,
              lat: null,
              lng: null,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {US_STATES.map((state) => (
              <SelectItem key={state.value} value={state.value}>
                {state.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>City</Label>
        <Input
          placeholder="Enter city"
          value={currentCity}
          onChange={(e) =>
            updateFilters({ city: e.target.value || null, lat: null, lng: null })
          }
        />
      </div>

      <div>
        <Label>Price Range</Label>
        <Select value={priceValue} onValueChange={handlePriceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Any price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any price</SelectItem>
            {PRICE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Child Age</Label>
        <Select value={ageValue} onValueChange={handleAgeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Any age" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any age</SelectItem>
            {AGE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Minimum Rating</Label>
        <Select value={currentMinRating || "all"} onValueChange={handleRatingChange}>
          <SelectTrigger>
            <SelectValue placeholder="Any rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any rating</SelectItem>
            {RATING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push("/search")}
      >
        Clear Filters
      </Button>
    </div>
  ), [currentState, currentCity, priceValue, ageValue, currentMinRating, handlePriceChange, handleAgeChange, handleRatingChange, updateFilters, router]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="query"
            placeholder="Search by name or location..."
            defaultValue={currentQuery}
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>

        {/* Geolocation button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={currentLat ? "default" : "outline"}
                size="icon"
                onClick={handleGeolocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search near me</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* View toggle */}
        {onViewChange && (
          <div className="hidden sm:flex border rounded-md">
            <Button
              type="button"
              variant={currentView === "list" ? "default" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => onViewChange("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={currentView === "map" ? "default" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => onViewChange("map")}
              aria-label="Map view"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile filters */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open filters">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {filterControls}
            </div>
          </SheetContent>
        </Sheet>
      </form>

      {/* Desktop filters */}
      <div className="hidden lg:flex gap-4 flex-wrap">
        <Select
          value={currentState || "all"}
          onValueChange={(value) =>
            updateFilters({
              state: value === "all" ? null : value,
              city: null,
              lat: null,
              lng: null,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {US_STATES.map((state) => (
              <SelectItem key={state.value} value={state.value}>
                {state.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="City"
          value={currentCity}
          onChange={(e) =>
            updateFilters({ city: e.target.value || null, lat: null, lng: null })
          }
          className="w-[150px]"
        />

        <Select value={priceValue} onValueChange={handlePriceChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any price</SelectItem>
            {PRICE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageValue} onValueChange={handleAgeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Child age" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any age</SelectItem>
            {AGE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentMinRating || "all"} onValueChange={handleRatingChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any rating</SelectItem>
            {RATING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={() => router.push("/search")}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
