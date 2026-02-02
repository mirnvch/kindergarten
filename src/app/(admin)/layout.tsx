import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shield } from "lucide-react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { DashboardLayout } from "@/components/shared";
import { check2FAEnabled } from "@/server/actions/security/two-factor";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Mandatory 2FA for Admin users
  const has2FA = await check2FAEnabled(session.user.id);
  if (!has2FA) {
    redirect("/admin/setup-2fa");
  }

  const user = {
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email ?? "",
    role: session.user.role,
  };

  const sidebar = <AdminSidebar user={user} />;

  return (
    <DashboardLayout
      sidebar={sidebar}
      branding={{
        icon: (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
        ),
        text: "Admin Panel",
        href: "/admin",
      }}
    >
      {children}
    </DashboardLayout>
  );
}
