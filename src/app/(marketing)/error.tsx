"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCcw, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketingError({
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
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
      <h1 className="mb-2 text-3xl font-bold">Something went wrong</h1>
      <p className="mb-8 max-w-md text-lg text-muted-foreground">
        We encountered an unexpected error. Our team has been notified and is
        working to fix it.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button onClick={() => reset()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
      <div className="mt-12 border-t pt-8">
        <p className="mb-4 text-sm text-muted-foreground">
          Looking for something specific?
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/search"
            className="text-sm text-primary hover:underline"
          >
            <Search className="mr-1 inline h-4 w-4" />
            Search Daycares
          </Link>
          <Link href="/help" className="text-sm text-primary hover:underline">
            Help Center
          </Link>
          <Link
            href="/contact"
            className="text-sm text-primary hover:underline"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
