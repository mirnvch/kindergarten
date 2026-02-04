import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { auth } from "@/lib/auth";
import {
  Search,
  Shield,
  Star,
  MessageSquare,
  CreditCard,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Easy Search",
    description:
      "Find healthcare providers near you with advanced filters for specialty, availability, and insurance.",
  },
  {
    icon: Shield,
    title: "Verified Providers",
    description:
      "All providers are licensed and verified with verified credentials.",
  },
  {
    icon: Star,
    title: "Trusted Reviews",
    description:
      "Read honest reviews from real patients to make informed decisions.",
  },
  {
    icon: MessageSquare,
    title: "Direct Messaging",
    description:
      "Connect directly with providers to ask questions and schedule appointments.",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description:
      "Pay for services securely online with automatic billing and receipts.",
  },
  {
    icon: BarChart3,
    title: "Provider Tools",
    description:
      "Powerful dashboard for providers to manage appointments and grow their practice.",
  },
];

const stats = [
  { value: "10,000+", label: "Providers" },
  { value: "50,000+", label: "Patients" },
  { value: "100+", label: "Cities" },
  { value: "4.8/5", label: "Average Rating" },
];

export default async function HomePage() {
  const session = await auth();

  const user = session?.user
    ? {
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email ?? "",
        avatarUrl: session.user.image,
        role: session.user.role,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Find the Perfect Healthcare Provider
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Browse thousands of healthcare providers, read reviews from real
                patients, and book appointments online. DocConnect makes finding quality
                healthcare easy.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/search">
                    Find Providers <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/for-providers">List Your Practice</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-primary/20 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y bg-muted/30 py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-primary sm:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything You Need to Find Great Healthcare
              </h2>
              <p className="mt-4 text-muted-foreground">
                DocConnect connects patients with quality healthcare providers and gives
                practices the tools they need to succeed.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="relative rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Providers Section */}
        <section className="bg-muted/30 py-20 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Grow Your Healthcare Practice
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Join thousands of providers using DocConnect to fill appointments,
                  manage payments, and communicate with patients.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Free listing to reach more patients",
                    "Automated appointment scheduling and reminders",
                    "Secure payment processing",
                    "Analytics to track your performance",
                    "Direct messaging with patients",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button size="lg" asChild>
                    <Link href="/register/provider">
                      Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-8">
                  <div className="h-full w-full rounded-lg bg-card shadow-2xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-20 sm:px-12 sm:py-28">
              <div className="relative mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                  Ready to Find the Perfect Provider?
                </h2>
                <p className="mt-4 text-primary-foreground/80">
                  Join thousands of patients who have found quality healthcare
                  through DocConnect.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/search">Search Providers</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link href="/register">Create Free Account</Link>
                  </Button>
                </div>
              </div>
              {/* Background decoration */}
              <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary-foreground/10" />
              <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-primary-foreground/10" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
