import { Metadata } from "next";
import Link from "next/link";
import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoBackButton } from "@/components/ui/go-back-button";

export const metadata: Metadata = {
  title: "Page Not Found | ToddlerHQ",
  description: "The page you're looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-8 text-8xl">🔍</div>
      <h1 className="mb-4 text-4xl font-bold">Page Not Found</h1>
      <p className="mb-8 max-w-md text-lg text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
        <GoBackButton />
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
          <Link href="/about" className="text-sm text-primary hover:underline">
            About Us
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-primary hover:underline"
          >
            Pricing
          </Link>
          <Link href="/help" className="text-sm text-primary hover:underline">
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
