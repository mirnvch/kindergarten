"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Baby,
  Calendar,
  Heart,
  MessageSquare,
  Settings,
  LogOut,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Children", href: "/dashboard/children", icon: Baby },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "Favorites", href: "/dashboard/favorites", icon: Heart },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface ParentSidebarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  notificationCount?: number;
}

export function ParentSidebar({ user, notificationCount = 0 }: ParentSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">K</span>
          </div>
          <span className="font-bold">KinderCare</span>
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
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Find Daycares
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
