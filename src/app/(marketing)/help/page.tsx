import { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  BookOpen,
  Users,
  Building2,
  CreditCard,
  Shield,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Help Center | ToddlerHQ",
  description: "Find answers to common questions and get help with ToddlerHQ.",
};

const categories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "New to ToddlerHQ? Start here.",
    articles: [
      "How to create an account",
      "Setting up your profile",
      "Finding your first daycare",
      "How to book a tour",
    ],
  },
  {
    icon: Users,
    title: "For Parents",
    description: "Help for families using ToddlerHQ.",
    articles: [
      "Searching for daycares",
      "Managing your children's profiles",
      "Understanding daycare ratings",
      "Leaving reviews",
    ],
  },
  {
    icon: Building2,
    title: "For Daycares",
    description: "Help for daycare providers.",
    articles: [
      "Creating your daycare profile",
      "Managing bookings",
      "Setting up programs and pricing",
      "Getting verified",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Payments",
    description: "Payment and subscription help.",
    articles: [
      "Payment methods",
      "Understanding subscription plans",
      "Refund policy",
      "Payment issues",
    ],
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    description: "Account security and data privacy.",
    articles: [
      "Two-factor authentication",
      "Password reset",
      "Data privacy settings",
      "Deleting your account",
    ],
  },
  {
    icon: MessageSquare,
    title: "Messaging",
    description: "Communication on ToddlerHQ.",
    articles: [
      "Sending messages",
      "Message notifications",
      "Blocking users",
      "Reporting inappropriate content",
    ],
  },
];

const popularArticles = [
  { title: "How do I reset my password?", href: "#" },
  { title: "How to cancel a booking", href: "#" },
  { title: "Updating payment information", href: "#" },
  { title: "How verification works for daycares", href: "#" },
  { title: "Understanding platform fees", href: "#" },
];

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Help Center</h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Find answers to your questions and learn how to get the most out of ToddlerHQ.
        </p>

        {/* Search */}
        <div className="mx-auto flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for help articles..."
              className="pl-10"
            />
          </div>
          <Button>Search</Button>
        </div>
      </div>

      {/* Popular Articles */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Popular Articles</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {popularArticles.map((article) => (
            <Link
              key={article.title}
              href={article.href}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <HelpCircle className="h-5 w-5 flex-shrink-0 text-primary" />
              <span className="text-sm">{article.title}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Browse by Category</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.title}>
              <CardHeader>
                <category.icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>{category.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.articles.map((article) => (
                    <li key={article}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {article}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Support */}
      <section className="rounded-lg bg-muted/40 px-8 py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Still Need Help?</h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Can&apos;t find what you&apos;re looking for? Our support team is here to help.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="mailto:support@toddlerhq.com">Email Us</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
