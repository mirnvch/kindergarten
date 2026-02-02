import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { getNotificationPreferences } from "@/server/actions/notifications";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ChevronRight, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings | Provider Portal",
  description: "Manage your account settings",
};

export default async function PortalSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const notificationPrefs = await getNotificationPreferences();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Personal info form */}
      <SettingsForm user={user} />

      {/* Notification preferences */}
      <NotificationPreferences
        initialPreferences={notificationPrefs || {
          emailBookings: true,
          emailMessages: true,
          emailMarketing: false,
          pushEnabled: false,
        }}
      />

      {/* Payment settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Payment Settings</CardTitle>
          </div>
          <CardDescription>
            Manage your payout method and payment preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/portal/billing">
              Manage Billing
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Security settings link */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>
            Two-factor authentication, active sessions, and account management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/portal/settings/security">
              Manage Security Settings
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
