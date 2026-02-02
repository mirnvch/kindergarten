"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  MessageSquare,
  Users,
  Settings,
  ExternalLink,
  BarChart3,
  Star,
  Receipt,
  Wallet,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  BaseSidebar,
  type NavItem,
  type SidebarUser,
} from "@/components/shared";

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { name: "My Daycare", href: "/portal/daycare", icon: Building2 },
  { name: "Verification", href: "/portal/verification", icon: ShieldCheck },
  { name: "Bookings", href: "/portal/bookings", icon: Calendar },
  { name: "Messages", href: "/portal/messages", icon: MessageSquare },
  { name: "Enrollments", href: "/portal/enrollments", icon: Users },
  { name: "Waitlist", href: "/portal/waitlist", icon: ClipboardList },
  { name: "Reviews", href: "/portal/reviews", icon: Star },
  { name: "Analytics", href: "/portal/analytics", icon: BarChart3 },
  { name: "Billing", href: "/portal/billing", icon: Receipt },
  { name: "Payments", href: "/portal/payments", icon: Wallet },
  { name: "Settings", href: "/portal/settings", icon: Settings },
];

interface PortalSidebarProps {
  user: SidebarUser;
  notificationCount?: number;
}

export function PortalSidebar({ user, notificationCount = 0 }: PortalSidebarProps) {
  return (
    <BaseSidebar
      user={user}
      navigation={navigation}
      branding={{
        icon: (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">K</span>
          </div>
        ),
        text: "KinderCare Portal",
        href: "/portal",
      }}
      headerSlot={<NotificationBell initialCount={notificationCount} />}
      footerSlot={
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Public Site
          </Link>
        </Button>
      }
      basePath="/portal"
    />
  );
}
