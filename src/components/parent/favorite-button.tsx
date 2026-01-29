"use client";

import { useTransition, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/server/actions/favorites";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  daycareId: string;
  initialFavorited?: boolean;
  variant?: "default" | "icon";
  className?: string;
}

export function FavoriteButton({
  daycareId,
  initialFavorited = false,
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);

  function handleToggle() {
    startTransition(async () => {
      try {
        const result = await toggleFavorite(daycareId);
        setIsFavorited(result.favorited);
        toast.success(
          result.favorited ? "Added to favorites" : "Removed from favorites"
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        );
      }
    });
  }

  if (variant === "icon") {
    return (
      <Button
        variant="secondary"
        size="icon"
        onClick={handleToggle}
        disabled={isPending}
        className={cn("h-8 w-8 rounded-full", className)}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isFavorited ? "default" : "outline"}
      onClick={handleToggle}
      disabled={isPending}
      className={className}
    >
      <Heart
        className={cn(
          "mr-2 h-4 w-4",
          isFavorited && "fill-current"
        )}
      />
      {isFavorited ? "Saved" : "Save"}
    </Button>
  );
}
