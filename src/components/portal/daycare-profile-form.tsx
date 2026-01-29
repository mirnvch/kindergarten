"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateDaycareProfile } from "@/server/actions/portal/daycare";
import { toast } from "sonner";

interface DaycareProfileFormProps {
  daycare: {
    id: string;
    name: string;
    description: string | null;
    email: string;
    phone: string;
    website: string | null;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    capacity: number;
    minAge: number;
    maxAge: number;
  };
}

export function DaycareProfileForm({ daycare }: DaycareProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: daycare.name,
    description: daycare.description || "",
    email: daycare.email,
    phone: daycare.phone,
    website: daycare.website || "",
    address: daycare.address,
    city: daycare.city,
    state: daycare.state,
    zipCode: daycare.zipCode,
    capacity: daycare.capacity,
    minAge: daycare.minAge,
    maxAge: daycare.maxAge,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateDaycareProfile(formData);
      if (result.success) {
        toast.success("Profile updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Your daycare name and description shown to parents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Daycare Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Tell parents about your daycare, your philosophy, and what makes you special..."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>How parents can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://www.yourdaycare.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Your daycare address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => updateField("state", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code *</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => updateField("zipCode", e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Age Range */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity & Age Range</CardTitle>
          <CardDescription>
            How many children you can accommodate and age groups you serve
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => updateField("capacity", parseInt(e.target.value) || 1)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of children
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAge">Minimum Age (months) *</Label>
              <Input
                id="minAge"
                type="number"
                min={0}
                value={formData.minAge}
                onChange={(e) => updateField("minAge", parseInt(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-muted-foreground">
                e.g., 6 for 6 months old
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAge">Maximum Age (months) *</Label>
              <Input
                id="maxAge"
                type="number"
                min={1}
                value={formData.maxAge}
                onChange={(e) => updateField("maxAge", parseInt(e.target.value) || 1)}
                required
              />
              <p className="text-xs text-muted-foreground">
                e.g., 60 for 5 years old
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
