"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
