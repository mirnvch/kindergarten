"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Baby,
  Calendar,
  Heart,
  Bookmark,
  MessageSquare,
  Settings,
  Search,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  BaseSidebar,
  type NavItem,
  type SidebarUser,
} from "@/components/shared";

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Family", href: "/dashboard/children", icon: Baby },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "Favorites", href: "/dashboard/favorites", icon: Heart },
  { name: "Saved Searches", href: "/dashboard/saved-searches", icon: Bookmark },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface ParentSidebarProps {
  user: SidebarUser;
  notificationCount?: number;
}

export function ParentSidebar({ user, notificationCount = 0 }: ParentSidebarProps) {
  return (
    <BaseSidebar
      user={user}
      navigation={navigation}
      branding={{
        icon: (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">D</span>
          </div>
        ),
        text: "DocConnect",
        href: "/dashboard",
      }}
      headerSlot={<NotificationBell initialCount={notificationCount} />}
      footerSlot={
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Find Providers
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      }
      basePath="/dashboard"
    />
  );
}
