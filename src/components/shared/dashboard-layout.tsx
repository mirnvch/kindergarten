import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export interface DashboardBranding {
  icon: React.ReactNode;
  text: string;
  href: string;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  branding: DashboardBranding;
}

/**
 * Shared dashboard layout with responsive sidebar.
 * - Desktop: Fixed sidebar on the left
 * - Mobile: Hamburger menu with slide-out sheet
 */
export function DashboardLayout({
  children,
  sidebar,
  branding,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            {sidebar}
          </SheetContent>
        </Sheet>
        <Link href={branding.href} className="flex items-center gap-2">
          {branding.icon}
          <span className="font-bold">{branding.text}</span>
        </Link>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 border-r bg-background md:block">
          {sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
