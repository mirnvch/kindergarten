import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TwoFactorSetup,
  LoginHistory,
  ActiveSessions,
  DataExportCard,
  DeleteAccountDialog,
} from "@/components/settings/security";
import { get2FAStatus } from "@/server/actions/security/two-factor";

export const metadata: Metadata = {
  title: "Security Settings | KinderCare",
  description: "Manage your account security settings",
};

export default async function SecuritySettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const twoFAStatus = await get2FAStatus();
  const hasPassword = !!user.passwordHash;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Security</h1>
          <p className="text-muted-foreground">
            Manage your account security and privacy settings
          </p>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <TwoFactorSetup
        enabled={twoFAStatus.data?.enabled ?? false}
        verifiedAt={twoFAStatus.data?.verifiedAt ?? null}
        backupCodesRemaining={twoFAStatus.data?.backupCodesRemaining ?? 0}
      />

      {/* Active Sessions */}
      <ActiveSessions />

      {/* Login History */}
      <LoginHistory />

      {/* Data Export */}
      <DataExportCard />

      {/* Delete Account */}
      <DeleteAccountDialog hasPassword={hasPassword} />
    </div>
  );
}
