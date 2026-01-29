import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Star, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFavorites } from "@/server/actions/favorites";
import { formatCurrency, formatAgeRange } from "@/lib/utils";
import { FavoriteButton } from "@/components/parent/favorite-button";

export const metadata: Metadata = {
  title: "Favorites | KinderCare",
  description: "Your saved daycare centers",
};

export default async function FavoritesPage() {
  const favorites = await getFavorites();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Favorites</h1>
        <p className="text-muted-foreground">
          Daycares you&apos;ve saved for later
        </p>
      </div>

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No favorites yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
            Save daycares you&apos;re interested in to easily find them later.
          </p>
          <Button asChild>
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Find Daycares
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => (
            <FavoriteCard key={fav.id} favorite={fav} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FavoriteCardProps {
  favorite: {
    id: string;
    daycare: {
      id: string;
      name: string;
      slug: string;
      address: string;
      city: string;
      state: string;
      pricePerMonth: unknown;
      minAge: number;
      maxAge: number;
      photo: string | null;
      rating: number | null;
      reviewCount: number;
    };
  };
}

function FavoriteCard({ favorite }: FavoriteCardProps) {
  const { daycare } = favorite;

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/10]">
        {daycare.photo ? (
          <Image
            src={daycare.photo}
            alt={daycare.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-4xl font-bold text-muted-foreground/30">
              {daycare.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <FavoriteButton daycareId={daycare.id} initialFavorited={true} />
        </div>
      </div>

      <CardContent className="p-4">
        <Link
          href={`/daycare/${daycare.slug}`}
          className="font-semibold hover:underline line-clamp-1"
        >
          {daycare.name}
        </Link>

        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {daycare.city}, {daycare.state}
            </span>
          </div>

          {daycare.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>
                {daycare.rating.toFixed(1)} ({daycare.reviewCount}{" "}
                {daycare.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>{formatCurrency(Number(daycare.pricePerMonth))}/month</span>
          </div>

          <div className="text-xs">
            Ages: {formatAgeRange(daycare.minAge, daycare.maxAge)}
          </div>
        </div>

        <div className="mt-4">
          <Button asChild size="sm" className="w-full">
            <Link href={`/daycare/${daycare.slug}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
