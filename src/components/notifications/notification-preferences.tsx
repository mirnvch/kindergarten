"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPreferences } from "@/server/actions/notifications";
import { toast } from "sonner";

interface NotificationPreferencesProps {
  initialPreferences: {
    emailAppointments: boolean;
    emailMessages: boolean;
    emailMarketing: boolean;
    pushEnabled: boolean;
  };
}

export function NotificationPreferences({ initialPreferences }: NotificationPreferencesProps) {
  const [isPending, startTransition] = useTransition();
  const [preferences, setPreferences] = useState(initialPreferences);

  const handleToggle = (key: keyof typeof preferences) => {
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));

    startTransition(async () => {
      const result = await updateNotificationPreferences({ [key]: newValue });
      if (!result.success) {
        // Revert on error
        setPreferences((prev) => ({ ...prev, [key]: !newValue }));
        toast.error(result.error || "Failed to update preferences");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Email Notifications</h4>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailAppointments">Appointment Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails for appointment confirmations and reminders
              </p>
            </div>
            <Switch
              id="emailAppointments"
              checked={preferences.emailAppointments}
              onCheckedChange={() => handleToggle("emailAppointments")}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailMessages">New Messages</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails when you get new messages
              </p>
            </div>
            <Switch
              id="emailMessages"
              checked={preferences.emailMessages}
              onCheckedChange={() => handleToggle("emailMessages")}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailMarketing">Marketing & Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive news, tips, and promotional offers
              </p>
            </div>
            <Switch
              id="emailMarketing"
              checked={preferences.emailMarketing}
              onCheckedChange={() => handleToggle("emailMarketing")}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="text-sm font-medium">Push Notifications</h4>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pushEnabled">Browser Push</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications in your browser
              </p>
            </div>
            <Switch
              id="pushEnabled"
              checked={preferences.pushEnabled}
              onCheckedChange={() => handleToggle("pushEnabled")}
              disabled={isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
