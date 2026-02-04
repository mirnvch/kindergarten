import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, BadgeCheck, Crown, Sparkles, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProviderSearchResult } from "@/server/actions/provider";

interface ProviderCardProps {
  provider: ProviderSearchResult;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const isTopTier = provider.subscriptionPlan === "PROFESSIONAL" || provider.subscriptionPlan === "ENTERPRISE";

  return (
    <Link href={`/provider/${provider.slug}`}>
      <Card className={cn(
        "overflow-hidden hover:shadow-lg transition-shadow h-full",
        isTopTier && "ring-2 ring-primary/20"
      )}>
        <div className="relative aspect-[4/3]">
          {provider.primaryPhoto ? (
            <Image
              src={provider.primaryPhoto}
              alt={provider.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {provider.isFeatured && (
              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            )}
            {provider.subscriptionPlan === "ENTERPRISE" && (
              <Badge className="bg-purple-600 hover:bg-purple-700">
                <Crown className="h-3 w-3 mr-1" />
                Enterprise
              </Badge>
            )}
            {provider.subscriptionPlan === "PROFESSIONAL" && !provider.isFeatured && (
              <Badge className="bg-blue-600 hover:bg-blue-700">
                <Sparkles className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold line-clamp-1 flex items-center gap-1">
              {provider.name}
              {provider.isVerified && (
                <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </h3>
            {provider.rating > 0 && (
              <div className="flex items-center gap-1 text-sm flex-shrink-0">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{provider.rating}</span>
                <span className="text-muted-foreground">
                  ({provider.reviewCount})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span>
              {provider.city}, {provider.state}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {provider.specialty || "General Practice"}
            </span>
            {provider.consultationFee && (
              <span className="font-semibold text-primary">
                ${provider.consultationFee.toLocaleString()}
              </span>
            )}
            {provider.offersTelehealth && (
              <Badge variant="outline" className="ml-1">
                <Video className="h-3 w-3 mr-1" />
                Telehealth
              </Badge>
            )}
          </div>

          {provider.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {provider.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
