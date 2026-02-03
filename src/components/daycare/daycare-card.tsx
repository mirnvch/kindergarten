import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, BadgeCheck, Crown, Sparkles, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProviderSearchResult } from "@/server/actions/daycare";

interface ProviderCardProps {
  daycare: ProviderSearchResult;
}

export function DaycareCard({ daycare }: ProviderCardProps) {
  const isTopTier = daycare.subscriptionPlan === "PROFESSIONAL" || daycare.subscriptionPlan === "ENTERPRISE";

  return (
    <Link href={`/provider/${daycare.slug}`}>
      <Card className={cn(
        "overflow-hidden hover:shadow-lg transition-shadow h-full",
        isTopTier && "ring-2 ring-primary/20"
      )}>
        <div className="relative aspect-[4/3]">
          {daycare.primaryPhoto ? (
            <Image
              src={daycare.primaryPhoto}
              alt={daycare.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {daycare.isFeatured && (
              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            )}
            {daycare.subscriptionPlan === "ENTERPRISE" && (
              <Badge className="bg-purple-600 hover:bg-purple-700">
                <Crown className="h-3 w-3 mr-1" />
                Enterprise
              </Badge>
            )}
            {daycare.subscriptionPlan === "PROFESSIONAL" && !daycare.isFeatured && (
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
              {daycare.name}
              {daycare.isVerified && (
                <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </h3>
            {daycare.rating > 0 && (
              <div className="flex items-center gap-1 text-sm flex-shrink-0">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{daycare.rating}</span>
                <span className="text-muted-foreground">
                  ({daycare.reviewCount})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span>
              {daycare.city}, {daycare.state}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {daycare.specialty || "General Practice"}
            </span>
            {daycare.consultationFee && (
              <span className="font-semibold text-primary">
                ${daycare.consultationFee.toLocaleString()}
              </span>
            )}
            {daycare.offersTelehealth && (
              <Badge variant="outline" className="ml-1">
                <Video className="h-3 w-3 mr-1" />
                Telehealth
              </Badge>
            )}
          </div>

          {daycare.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {daycare.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
