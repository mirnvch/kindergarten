import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DaycareSearchResult } from "@/server/actions/daycare";

interface DaycareCardProps {
  daycare: DaycareSearchResult;
}

function formatAge(months: number): string {
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years}yr`;
  return `${years}yr ${remainingMonths}mo`;
}

export function DaycareCard({ daycare }: DaycareCardProps) {
  return (
    <Link href={`/daycare/${daycare.slug}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
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
          {daycare.isFeatured && (
            <Badge className="absolute top-2 left-2 bg-yellow-500 hover:bg-yellow-600">
              Featured
            </Badge>
          )}
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
              Ages {formatAge(daycare.minAge)} - {formatAge(daycare.maxAge)}
            </span>
            <span className="font-semibold text-primary">
              ${daycare.pricePerMonth.toLocaleString()}/mo
            </span>
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
