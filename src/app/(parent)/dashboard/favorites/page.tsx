import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Star, Search, DollarSign, Video, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getFavorites } from "@/server/actions/favorites";
import { formatCurrency } from "@/lib/utils";
import { FavoriteButton } from "@/components/parent/favorite-button";
import type { FavoriteItem } from "@/types";

export const metadata: Metadata = {
  title: "Favorites | DocConnect",
  description: "Your saved healthcare providers",
};

export default async function FavoritesPage() {
  const favorites = await getFavorites();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Favorites</h1>
        <p className="text-muted-foreground">
          Providers you&apos;ve saved for later
        </p>
      </div>

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No favorites yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
            Save providers you&apos;re interested in to easily find them later.
          </p>
          <Button asChild>
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Find Providers
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav: FavoriteItem) => (
            <FavoriteCard key={fav.id} favorite={fav} />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({ favorite }: { favorite: FavoriteItem }) {
  const { provider } = favorite;

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/10]">
        {provider.photo ? (
          <Image
            src={provider.photo}
            alt={provider.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-4xl font-bold text-muted-foreground/30">
              {provider.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <FavoriteButton providerId={provider.id} initialFavorited={true} />
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/provider/${provider.slug}`}
              className="font-semibold hover:underline line-clamp-1"
            >
              {provider.name}
              {provider.credentials && (
                <span className="text-muted-foreground font-normal">
                  , {provider.credentials}
                </span>
              )}
            </Link>
            {provider.specialty && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Stethoscope className="h-3 w-3" />
                {provider.specialty}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {provider.city}, {provider.state}
            </span>
          </div>

          {provider.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>
                {provider.rating.toFixed(1)} ({provider.reviewCount}{" "}
                {provider.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}

          {provider.consultationFee && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 shrink-0" />
              <span>{formatCurrency(Number(provider.consultationFee))} per visit</span>
            </div>
          )}

          {provider.offersTelehealth && (
            <Badge variant="secondary" className="text-xs">
              <Video className="h-3 w-3 mr-1" />
              Telehealth Available
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <Button asChild size="sm" className="w-full">
            <Link href={`/provider/${provider.slug}`}>View Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
