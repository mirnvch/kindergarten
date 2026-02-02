import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { check2FAEnabled } from "@/server/actions/security/two-factor";

export default async function AdminSetup2FALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Must be an admin
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // If 2FA is already enabled, redirect to admin panel
  const has2FA = await check2FAEnabled(session.user.id);
  if (has2FA) {
    redirect("/admin");
  }

  return <>{children}</>;
}
