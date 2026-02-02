"use client";

import { useState } from "react";
import { Building2, MapPin, Users, Phone, Mail, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createDaycare } from "@/server/actions/portal/daycare";
import { toast } from "sonner";

export default function DaycareSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    capacity: 20,
    minAge: 6,
    maxAge: 60,
    openingTime: "07:00",
    closingTime: "18:00",
    pricePerMonth: 1500,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createDaycare(formData);
      if (result && !result.success) {
        toast.error(result.error || "Failed to create daycare");
      }
    } catch {
      // Redirect happens automatically on success
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Set Up Your Daycare</h1>
        <p className="text-muted-foreground">
          Create your daycare profile to start receiving bookings from parents
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Tell parents about your daycare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Daycare Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Sunshine Kids Daycare"
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
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>How parents can reach you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="mr-1 inline h-4 w-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="contact@yourdaycare.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="mr-1 inline h-4 w-4" />
                  Phone *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
            <CardDescription>Your daycare address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="123 Main Street"
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
                  placeholder="San Francisco"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  placeholder="CA"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  placeholder="94102"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity & Age Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Capacity & Age Range
            </CardTitle>
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
                  onChange={(e) =>
                    updateField("capacity", parseInt(e.target.value) || 1)
                  }
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
                  onChange={(e) =>
                    updateField("minAge", parseInt(e.target.value) || 0)
                  }
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
                  onChange={(e) =>
                    updateField("maxAge", parseInt(e.target.value) || 1)
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  e.g., 60 for 5 years old
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Hours & Pricing
            </CardTitle>
            <CardDescription>
              Your operating hours and pricing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="openingTime">Opening Time *</Label>
                <Input
                  id="openingTime"
                  type="time"
                  value={formData.openingTime}
                  onChange={(e) => updateField("openingTime", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingTime">Closing Time *</Label>
                <Input
                  id="closingTime"
                  type="time"
                  value={formData.closingTime}
                  onChange={(e) => updateField("closingTime", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerMonth">
                  <DollarSign className="mr-1 inline h-4 w-4" />
                  Monthly Price *
                </Label>
                <Input
                  id="pricePerMonth"
                  type="number"
                  min={0}
                  step={50}
                  value={formData.pricePerMonth}
                  onChange={(e) =>
                    updateField("pricePerMonth", parseFloat(e.target.value) || 0)
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Base monthly tuition
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? "Creating..." : "Create Daycare"}
          </Button>
        </div>
      </form>
    </div>
  );
}
