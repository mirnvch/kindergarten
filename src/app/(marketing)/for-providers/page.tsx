import { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Calendar,
  BarChart3,
  CreditCard,
  Shield,
  MessageSquare,
  Star,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "For Healthcare Providers | DocConnect",
  description:
    "Grow your healthcare practice with DocConnect. Reach more patients, manage appointments easily, and access powerful analytics.",
};

const benefits = [
  {
    icon: Users,
    title: "Reach More Patients",
    description:
      "Connect with thousands of patients actively searching for quality healthcare in your area.",
  },
  {
    icon: Calendar,
    title: "Easy Appointment Management",
    description:
      "Manage appointment requests, patient intake, and waitlists all in one place with our intuitive dashboard.",
  },
  {
    icon: BarChart3,
    title: "Powerful Analytics",
    description:
      "Understand your practice with detailed insights on appointments, revenue, and patient engagement.",
  },
  {
    icon: CreditCard,
    title: "Seamless Payments",
    description:
      "Accept payments online and get paid directly to your bank account with Stripe integration.",
  },
  {
    icon: Shield,
    title: "Build Trust",
    description:
      "Get verified and display badges that show patients you meet our quality standards.",
  },
  {
    icon: MessageSquare,
    title: "Direct Messaging",
    description:
      "Communicate directly with patients through our secure, HIPAA-compliant messaging system.",
  },
];

const features = [
  "Custom provider profile page",
  "Online appointment booking",
  "Patient intake management",
  "Waitlist management",
  "Patient messaging",
  "Review management",
  "Analytics dashboard",
  "Payment processing",
  "Mobile-friendly portal",
  "Email notifications",
  "Calendar integration",
  "Team member accounts",
];

const testimonials = [
  {
    quote:
      "DocConnect has transformed how we manage our practice. The booking system alone saves us hours every week.",
    author: "Dr. Sarah M.",
    role: "Family Medicine Physician",
  },
  {
    quote:
      "We've seen a 40% increase in new patient requests since joining DocConnect. The platform really delivers on its promise.",
    author: "Michael T.",
    role: "Practice Manager, City Health Clinic",
  },
  {
    quote:
      "The analytics help me understand which services are most in demand and where to focus my marketing efforts.",
    author: "Dr. Jennifer L.",
    role: "Owner, Wellness Medical Center",
  },
];

export default function ForProvidersPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Grow Your Healthcare Practice
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Join thousands of healthcare providers who use DocConnect to reach more
            patients, manage appointments, and grow their practice.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register/provider">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Start with our free plan.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold">
            Why Choose DocConnect?
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Everything you need to run your practice more efficiently and connect
            with more patients.
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardHeader>
                  <benefit.icon className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features List Section */}
      <section className="bg-muted/40 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Everything You Need in One Platform
            </h2>
            <p className="mb-12 text-muted-foreground">
              Our comprehensive suite of tools helps you manage every aspect of
              your healthcare practice.
            </p>
            <div className="grid gap-4 text-left sm:grid-cols-2 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Trusted by Healthcare Providers
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <blockquote className="mb-4 text-muted-foreground">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">
            Ready to Grow Your Practice?
          </h2>
          <p className="mx-auto mb-8 max-w-xl opacity-90">
            Join DocConnect today and start connecting with patients in your
            area. Setup takes less than 10 minutes.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register/provider">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
