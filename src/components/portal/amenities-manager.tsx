"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateDaycareAmenities } from "@/server/actions/portal/amenities";
import { toast } from "sonner";

interface Amenity {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
}

interface AmenitiesManagerProps {
  allAmenities: Amenity[];
  selectedAmenityIds: string[];
}

export function AmenitiesManager({
  allAmenities,
  selectedAmenityIds,
}: AmenitiesManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedAmenityIds)
  );

  const handleToggle = (amenityId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(amenityId)) {
        next.delete(amenityId);
      } else {
        next.add(amenityId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateDaycareAmenities(Array.from(selected));
      if (result.success) {
        toast.success("Amenities updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update amenities");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Group amenities by category
  const grouped = allAmenities.reduce(
    (acc, amenity) => {
      const category = amenity.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(amenity);
      return acc;
    },
    {} as Record<string, Amenity[]>
  );

  const categories = Object.keys(grouped).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Amenities
        </CardTitle>
        <CardDescription>
          Select the amenities and features your daycare offers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {allAmenities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No amenities available. Contact admin to add amenities.
            </p>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <h4 className="font-medium mb-3">{category}</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {grouped[category].map((amenity) => (
                      <div
                        key={amenity.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={amenity.id}
                          checked={selected.has(amenity.id)}
                          onCheckedChange={() => handleToggle(amenity.id)}
                        />
                        <Label
                          htmlFor={amenity.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {amenity.icon && (
                            <span className="mr-1">{amenity.icon}</span>
                          )}
                          {amenity.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selected.size} amenities selected
            </p>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Amenities"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
