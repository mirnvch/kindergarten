"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  MessageSquare,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ExternalLink,
  BarChart3,
  Star,
  Receipt,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navigation = [
  { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { name: "My Daycare", href: "/portal/daycare", icon: Building2 },
  { name: "Bookings", href: "/portal/bookings", icon: Calendar },
  { name: "Messages", href: "/portal/messages", icon: MessageSquare },
  { name: "Enrollments", href: "/portal/enrollments", icon: Users },
  { name: "Reviews", href: "/portal/reviews", icon: Star },
  { name: "Analytics", href: "/portal/analytics", icon: BarChart3 },
  { name: "Billing", href: "/portal/billing", icon: Receipt },
  { name: "Payments", href: "/portal/payments", icon: Wallet },
  { name: "Settings", href: "/portal/settings", icon: Settings },
];

interface PortalSidebarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  notificationCount?: number;
}

export function PortalSidebar({ user, notificationCount = 0 }: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">K</span>
          </div>
          <span className="font-bold">KinderCare Portal</span>
        </div>
        <NotificationBell initialCount={notificationCount} />
      </div>

      {/* User info */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar>
          <AvatarFallback>
            {getInitials(user.firstName, user.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t p-4 space-y-2">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/" target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Public Site
          </Link>
        </Button>
        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
