"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSettings, DEFAULT_SETTINGS } from "@/server/actions/admin/settings";
import { toast } from "sonner";

type Settings = typeof DEFAULT_SETTINGS;

interface SettingsFormProps {
  initialSettings: Partial<Settings>;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Merge with defaults
  const [settings, setSettings] = useState<Settings>({
    site: { ...DEFAULT_SETTINGS.site, ...(initialSettings.site as object) },
    features: { ...DEFAULT_SETTINGS.features, ...(initialSettings.features as object) },
    pricing: { ...DEFAULT_SETTINGS.pricing, ...(initialSettings.pricing as object) },
    moderation: { ...DEFAULT_SETTINGS.moderation, ...(initialSettings.moderation as object) },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateSettings(settings);
      if (result.success) {
        toast.success("Settings saved successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const updateSite = (key: keyof Settings["site"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      site: { ...prev.site, [key]: value },
    }));
  };

  const updateFeature = (key: keyof Settings["features"], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
  };

  const updatePricing = (key: keyof Settings["pricing"], value: number) => {
    setSettings((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, [key]: value },
    }));
  };

  const updateModeration = (key: keyof Settings["moderation"], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      moderation: { ...prev.moderation, [key]: value },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>Basic platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={settings.site.name}
                onChange={(e) => updateSite("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={settings.site.tagline}
                onChange={(e) => updateSite("tagline", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={settings.site.contactEmail}
                onChange={(e) => updateSite("contactEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhone">Support Phone</Label>
              <Input
                id="supportPhone"
                type="tel"
                value={settings.site.supportPhone}
                onChange={(e) => updateSite("supportPhone", e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Enable or disable platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>User Registration</Label>
              <p className="text-sm text-muted-foreground">Allow new users to register</p>
            </div>
            <Switch
              checked={settings.features.enableRegistration}
              onCheckedChange={(v) => updateFeature("enableRegistration", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Daycare Signup</Label>
              <p className="text-sm text-muted-foreground">Allow daycares to register</p>
            </div>
            <Switch
              checked={settings.features.enableDaycareSignup}
              onCheckedChange={(v) => updateFeature("enableDaycareSignup", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Reviews</Label>
              <p className="text-sm text-muted-foreground">Allow users to leave reviews</p>
            </div>
            <Switch
              checked={settings.features.enableReviews}
              onCheckedChange={(v) => updateFeature("enableReviews", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Messaging</Label>
              <p className="text-sm text-muted-foreground">Enable messaging between users and daycares</p>
            </div>
            <Switch
              checked={settings.features.enableMessaging}
              onCheckedChange={(v) => updateFeature("enableMessaging", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Waitlist</Label>
              <p className="text-sm text-muted-foreground">Enable waitlist for full daycares</p>
            </div>
            <Switch
              checked={settings.features.enableWaitlist}
              onCheckedChange={(v) => updateFeature("enableWaitlist", v)}
            />
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label className="text-red-600">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">Put the site in maintenance mode</p>
            </div>
            <Switch
              checked={settings.features.maintenanceMode}
              onCheckedChange={(v) => updateFeature("maintenanceMode", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Booking</CardTitle>
          <CardDescription>Configure pricing and booking rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="platformFee">Platform Fee (%)</Label>
              <Input
                id="platformFee"
                type="number"
                min="0"
                max="100"
                value={settings.pricing.platformFeePercent}
                onChange={(e) => updatePricing("platformFeePercent", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minNotice">Min Booking Notice (hours)</Label>
              <Input
                id="minNotice"
                type="number"
                min="0"
                value={settings.pricing.minBookingNoticeHours}
                onChange={(e) => updatePricing("minBookingNoticeHours", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAdvance">Max Booking Advance (days)</Label>
              <Input
                id="maxAdvance"
                type="number"
                min="1"
                value={settings.pricing.maxBookingAdvanceDays}
                onChange={(e) => updatePricing("maxBookingAdvanceDays", parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation</CardTitle>
          <CardDescription>Configure moderation behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-approve Reviews</Label>
              <p className="text-sm text-muted-foreground">Automatically approve new reviews</p>
            </div>
            <Switch
              checked={settings.moderation.autoApproveReviews}
              onCheckedChange={(v) => updateModeration("autoApproveReviews", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-approve Daycares</Label>
              <p className="text-sm text-muted-foreground">Automatically approve new daycare registrations</p>
            </div>
            <Switch
              checked={settings.moderation.autoApproveDaycares}
              onCheckedChange={(v) => updateModeration("autoApproveDaycares", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">Users must verify email before full access</p>
            </div>
            <Switch
              checked={settings.moderation.requireEmailVerification}
              onCheckedChange={(v) => updateModeration("requireEmailVerification", v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
