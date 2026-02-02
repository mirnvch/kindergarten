"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Navigation item configuration
 */
export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/**
 * User info for sidebar
 */
export interface SidebarUser {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

/**
 * Branding configuration
 */
export interface SidebarBranding {
  icon: React.ReactNode;
  text: string;
  href: string;
}

/**
 * Theme configuration for sidebar
 */
export interface SidebarTheme {
  /** Active item background color class */
  activeClass?: string;
  /** Avatar background and text color classes */
  avatarClass?: string;
}

export interface BaseSidebarProps {
  user: SidebarUser;
  navigation: NavItem[];
  branding: SidebarBranding;
  /** Optional slot for header area (e.g., notification bell) */
  headerSlot?: React.ReactNode;
  /** Optional slot for footer area (e.g., "Find Daycares" button) */
  footerSlot?: React.ReactNode;
  /** Custom theme configuration */
  theme?: SidebarTheme;
  /** Show email or role in user info */
  showEmail?: boolean;
  /** Base path for active detection (e.g., "/dashboard", "/portal", "/admin") */
  basePath?: string;
}

const defaultTheme: SidebarTheme = {
  activeClass: "bg-primary text-primary-foreground",
  avatarClass: "",
};

export function BaseSidebar({
  user,
  navigation,
  branding,
  headerSlot,
  footerSlot,
  theme = defaultTheme,
  showEmail = true,
  basePath,
}: BaseSidebarProps) {
  const pathname = usePathname();
  const mergedTheme = { ...defaultTheme, ...theme };

  const isActive = (href: string) => {
    if (pathname === href) return true;
    // For non-base paths, check if pathname starts with href
    if (basePath && href !== basePath && pathname.startsWith(href)) {
      return true;
    }
    return false;
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Logo/Branding */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href={branding.href} className="flex items-center gap-2">
          {branding.icon}
          <span className="font-bold">{branding.text}</span>
        </Link>
        {headerSlot}
      </div>

      {/* User info */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar>
          <AvatarFallback className={mergedTheme.avatarClass}>
            {getInitials(user.firstName, user.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {showEmail ? user.email : user.role}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? mergedTheme.activeClass
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
        {footerSlot}
        <LogoutButton
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
        />
      </div>
    </div>
  );
}
