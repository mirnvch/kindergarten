import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Offline | KinderCare",
  description: "You are currently offline",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-6 p-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You&apos;re Offline</h1>
          <p className="text-muted-foreground max-w-sm">
            It looks like you&apos;ve lost your internet connection. Some features
            may not be available until you&apos;re back online.
          </p>
        </div>
        <div className="space-y-3">
          <Button asChild>
            <Link href="/">Try Again</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Cached content may still be available
          </p>
        </div>
      </div>
    </div>
  );
}
