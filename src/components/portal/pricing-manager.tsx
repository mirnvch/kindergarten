"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    consultationFee?: Prisma.Decimal | null;
    telehealthFee?: Prisma.Decimal | null;
    acceptsUninsured?: boolean;
    slidingScalePricing?: boolean;
  };
}

export function PricingManager({ pricing }: PricingManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PricingInput>({
    consultationFee: pricing.consultationFee ? Number(pricing.consultationFee) : null,
    telehealthFee: pricing.telehealthFee ? Number(pricing.telehealthFee) : null,
    acceptsUninsured: pricing.acceptsUninsured ?? false,
    slidingScalePricing: pricing.slidingScalePricing ?? false,
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

  const updateField = (field: keyof PricingInput, value: string | boolean) => {
    if (typeof value === "boolean") {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      const numValue = value === "" ? null : parseFloat(value);
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing
        </CardTitle>
        <CardDescription>
          Set your consultation fees and payment options.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="consultationFee">Consultation Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="consultationFee"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.consultationFee ?? ""}
                  onChange={(e) => updateField("consultationFee", e.target.value)}
                  className="pl-7"
                  placeholder="e.g., 150"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Standard in-person appointment fee
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telehealthFee">Telehealth Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="telehealthFee"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.telehealthFee ?? ""}
                  onChange={(e) => updateField("telehealthFee", e.target.value)}
                  className="pl-7"
                  placeholder="e.g., 100"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Virtual appointment fee (if applicable)
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Payment Options</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="acceptsUninsured">Accept Uninsured Patients</Label>
                <p className="text-xs text-muted-foreground">
                  Offer self-pay options for patients without insurance
                </p>
              </div>
              <Switch
                id="acceptsUninsured"
                checked={formData.acceptsUninsured ?? false}
                onCheckedChange={(checked) => updateField("acceptsUninsured", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="slidingScalePricing">Sliding Scale Pricing</Label>
                <p className="text-xs text-muted-foreground">
                  Offer reduced fees based on patient income
                </p>
              </div>
              <Switch
                id="slidingScalePricing"
                checked={formData.slidingScalePricing ?? false}
                onCheckedChange={(checked) => updateField("slidingScalePricing", checked)}
              />
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
