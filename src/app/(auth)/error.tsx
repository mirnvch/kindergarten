"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
      <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        We encountered an error while processing your request. Please try again
        or return to the login page.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button onClick={() => reset()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">
            <Home className="mr-2 h-4 w-4" />
            Go to Login
          </Link>
        </Button>
      </div>
    </div>
  );
}
