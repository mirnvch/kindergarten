import { redirect } from "next/navigation";
import Link from "next/link";
import { Menu, Shield } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button, Sheet, SheetContent, SheetTrigger } from "@kindergarten/ui";

// Inline sidebar for admin app (no dependency on root src/)
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Type assertion for extended user properties
  const extUser = session.user as { role?: string; firstName?: string; lastName?: string };

  if (extUser.role !== "ADMIN") {
    redirect("/");
  }

  const user = {
    firstName: extUser.firstName || "Admin",
    lastName: extUser.lastName || "User",
    email: session.user.email ?? "",
    role: extUser.role || "ADMIN",
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <AdminSidebar user={user} />
          </SheetContent>
        </Sheet>
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold">Admin Panel</span>
        </Link>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 border-r bg-background md:block">
          <AdminSidebar user={user} />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
