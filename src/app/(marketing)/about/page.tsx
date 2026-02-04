import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us | DocConnect",
  description: "Learn more about DocConnect and our mission",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">About DocConnect</h1>
        <p className="text-lg text-muted-foreground mb-8">
          DocConnect connects patients with trusted healthcare providers in their
          area. We make it easy to find, compare, and book quality healthcare
          that fits your needs.
        </p>

        <div className="grid md:grid-cols-3 gap-8 my-12">
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">For Patients</h3>
            <p className="text-muted-foreground">
              Search verified providers, read reviews, and book appointments online.
            </p>
          </div>
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">For Providers</h3>
            <p className="text-muted-foreground">
              Grow your practice with our platform and manage appointments easily.
            </p>
          </div>
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">Trusted</h3>
            <p className="text-muted-foreground">
              All providers are verified and reviewed by real patients.
            </p>
          </div>
        </div>

        <Button asChild size="lg">
          <Link href="/search">Find a Provider</Link>
        </Button>
      </div>
    </div>
  );
}
