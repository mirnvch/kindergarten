"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updatePricing, type PricingInput } from "@/server/actions/portal/pricing";
import { toast } from "sonner";
import { Prisma } from "@prisma/client";

interface PricingManagerProps {
  pricing: {
    pricePerMonth: Prisma.Decimal;
    pricePerWeek: Prisma.Decimal | null;
    pricePerDay: Prisma.Decimal | null;
    registrationFee: Prisma.Decimal | null;
  };
}

export function PricingManager({ pricing }: PricingManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PricingInput>({
    pricePerMonth: Number(pricing.pricePerMonth),
    pricePerWeek: pricing.pricePerWeek ? Number(pricing.pricePerWeek) : null,
    pricePerDay: pricing.pricePerDay ? Number(pricing.pricePerDay) : null,
    registrationFee: pricing.registrationFee
      ? Number(pricing.registrationFee)
      : null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updatePricing(formData);
      if (result.success) {
        toast.success("Pricing updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update pricing");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof PricingInput, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing
        </CardTitle>
        <CardDescription>
          Set your daycare&apos;s pricing structure. Monthly rate is required,
          other rates are optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pricePerMonth">Monthly Rate *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="pricePerMonth"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pricePerMonth ?? ""}
                  onChange={(e) => updateField("pricePerMonth", e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Standard monthly tuition rate
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerWeek">Weekly Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="pricePerWeek"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pricePerWeek ?? ""}
                  onChange={(e) => updateField("pricePerWeek", e.target.value)}
                  className="pl-7"
                  placeholder="Optional"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For part-time or weekly enrollment
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerDay">Daily Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="pricePerDay"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pricePerDay ?? ""}
                  onChange={(e) => updateField("pricePerDay", e.target.value)}
                  className="pl-7"
                  placeholder="Optional"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For drop-in or daily care
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationFee">Registration Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="registrationFee"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.registrationFee ?? ""}
                  onChange={(e) => updateField("registrationFee", e.target.value)}
                  className="pl-7"
                  placeholder="Optional"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                One-time enrollment fee
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Pricing"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
