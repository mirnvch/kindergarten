import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us | KinderCare",
  description: "Learn more about KinderCare and our mission",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">About KinderCare</h1>
        <p className="text-lg text-muted-foreground mb-8">
          KinderCare connects families with trusted daycare providers in their
          area. We make it easy to find, compare, and book quality childcare
          that fits your family&apos;s needs.
        </p>

        <div className="grid md:grid-cols-3 gap-8 my-12">
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">For Parents</h3>
            <p className="text-muted-foreground">
              Search verified daycares, read reviews, and book tours online.
            </p>
          </div>
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">For Providers</h3>
            <p className="text-muted-foreground">
              Grow your business with our platform and manage bookings easily.
            </p>
          </div>
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">Trusted</h3>
            <p className="text-muted-foreground">
              All providers are verified and reviewed by real parents.
            </p>
          </div>
        </div>

        <Button asChild size="lg">
          <Link href="/search">Find a Daycare</Link>
        </Button>
      </div>
    </div>
  );
}
