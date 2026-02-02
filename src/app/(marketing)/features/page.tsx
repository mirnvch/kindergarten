import { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Calendar,
  MessageSquare,
  Star,
  Building2,
  BarChart3,
  CreditCard,
  Users,
  Shield,
  Smartphone,
  Bell,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Features | ToddlerHQ",
  description: "Explore all the features ToddlerHQ offers for parents and daycare providers.",
};

const parentFeatures = [
  {
    icon: Search,
    title: "Smart Search",
    description: "Find daycares by location, age group, programs, price, and more. Filter and compare to find the perfect match.",
  },
  {
    icon: Calendar,
    title: "Easy Booking",
    description: "Book tours and schedule visits online. No phone calls needed - see availability and book in seconds.",
  },
  {
    icon: MessageSquare,
    title: "Direct Messaging",
    description: "Communicate directly with daycare providers. Ask questions and get answers quickly through our secure platform.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    description: "Read authentic reviews from other parents. Make informed decisions based on real experiences.",
  },
];

const providerFeatures = [
  {
    icon: Building2,
    title: "Professional Profile",
    description: "Showcase your daycare with photos, programs, pricing, and availability. Stand out to prospective families.",
  },
  {
    icon: Calendar,
    title: "Booking Management",
    description: "Manage tour requests and enrollments from one dashboard. Accept, decline, or reschedule with ease.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track profile views, bookings, and revenue. Understand your performance with detailed insights.",
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    description: "Accept payments online through Stripe. Get paid directly to your bank account securely.",
  },
];

const platformFeatures = [
  {
    icon: Shield,
    title: "Security & Trust",
    description: "Verified provider badges, secure messaging, and encrypted payments. Your data is always protected.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Access ToddlerHQ from any device. Our responsive design works perfectly on phones, tablets, and desktops.",
  },
  {
    icon: Bell,
    title: "Real-time Notifications",
    description: "Get instant updates on bookings, messages, and important events. Never miss an opportunity.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Our platform is always available. Browse, book, and manage at any time that works for you.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Platform Features</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          ToddlerHQ provides powerful tools for both parents looking for childcare
          and daycare providers looking to grow their business.
        </p>
      </div>

      {/* For Parents */}
      <section className="mb-20">
        <div className="mb-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-2 text-3xl font-bold">For Parents</h2>
          <p className="text-muted-foreground">
            Everything you need to find the perfect daycare for your child
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {parentFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/search">Find a Daycare</Link>
          </Button>
        </div>
      </section>

      {/* For Providers */}
      <section className="mb-20">
        <div className="mb-8 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-2 text-3xl font-bold">For Daycare Providers</h2>
          <p className="text-muted-foreground">
            Tools to manage and grow your daycare business
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {providerFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/for-daycares">Learn More</Link>
          </Button>
        </div>
      </section>

      {/* Platform Features */}
      <section className="mb-20">
        <div className="mb-8 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-2 text-3xl font-bold">Platform Features</h2>
          <p className="text-muted-foreground">
            Built with security, reliability, and ease of use in mind
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {platformFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-lg bg-muted/40 px-8 py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Ready to Get Started?</h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Join thousands of families and daycare providers already using ToddlerHQ.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">Create an Account</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
