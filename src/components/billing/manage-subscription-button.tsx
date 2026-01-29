"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { createCustomerPortalSession } from "@/server/actions/stripe";
import { toast } from "sonner";

export function ManageSubscriptionButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await createCustomerPortalSession();
      if (result && "error" in result) {
        toast.error(result.error);
      }
      // If successful, user will be redirected to Stripe Customer Portal
    });
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          Manage Subscription
        </>
      )}
    </Button>
  );
}
