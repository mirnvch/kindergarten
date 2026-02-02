import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ParentSidebar } from "@/components/parent/parent-sidebar";
import { DashboardLayout } from "@/components/shared";
import { getUnreadNotificationsCount } from "@/server/actions/notifications";
import { needs2FAVerification } from "@/server/actions/security/two-factor";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "PATIENT") {
    redirect("/portal");
  }

  // Check if 2FA verification is needed (for OAuth users with 2FA enabled)
  const needs2FA = await needs2FAVerification(session.user.id);
  if (needs2FA) {
    redirect(`/login/verify-2fa?userId=${session.user.id}&callbackUrl=/dashboard`);
  }

  const user = {
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email ?? "",
    role: session.user.role,
  };

  const notificationCount = await getUnreadNotificationsCount();

  const sidebar = (
    <ParentSidebar user={user} notificationCount={notificationCount} />
  );

  return (
    <DashboardLayout
      sidebar={sidebar}
      branding={{
        icon: (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">D</span>
          </div>
        ),
        text: "DocConnect",
        href: "/dashboard",
      }}
    >
      {children}
    </DashboardLayout>
  );
}
