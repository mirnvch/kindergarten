"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  Star,
  Settings,
  ExternalLink,
  Shield,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BaseSidebar,
  type NavItem,
  type SidebarUser,
  type SidebarTheme,
} from "@/components/shared";

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Daycares", href: "/admin/daycares", icon: Building2 },
  { name: "Verifications", href: "/admin/verifications", icon: ShieldCheck },
  { name: "Reviews", href: "/admin/reviews", icon: Star },
  { name: "Messages", href: "/admin/messages", icon: MessageSquare },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const adminTheme: SidebarTheme = {
  activeClass: "bg-red-600 text-white",
  avatarClass: "bg-red-100 text-red-600",
};

interface AdminSidebarProps {
  user: SidebarUser;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  return (
    <BaseSidebar
      user={user}
      navigation={navigation}
      branding={{
        icon: (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
        ),
        text: "Admin Panel",
        href: "/admin",
      }}
      footerSlot={
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Public Site
          </Link>
        </Button>
      }
      theme={adminTheme}
      showEmail={false}
      basePath="/admin"
    />
  );
}
