"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createConnectAccount } from "@/server/actions/stripe";
import { toast } from "sonner";

interface ConnectAccountButtonProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export function ConnectAccountButton({ children, variant = "default" }: ConnectAccountButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await createConnectAccount();
      if (result && "error" in result) {
        toast.error(result.error);
      }
      // If successful, user will be redirected to Stripe Connect onboarding
    });
  };

  return (
    <Button variant={variant} onClick={handleClick} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
