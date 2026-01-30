"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";

interface LogoutButtonProps {
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

export function LogoutButton({ variant = "ghost", className }: LogoutButtonProps) {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant={variant}
        className={className}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}
