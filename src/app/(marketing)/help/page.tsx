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
  title: "Help Center | DocConnect",
  description: "Find answers to common questions and get help with DocConnect.",
};

const categories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "New to DocConnect? Start here.",
    articles: [
      "How to create an account",
      "Setting up your profile",
      "Finding your first provider",
      "How to book an appointment",
    ],
  },
  {
    icon: Users,
    title: "For Patients",
    description: "Help for patients using DocConnect.",
    articles: [
      "Searching for healthcare providers",
      "Managing your health profile",
      "Understanding provider ratings",
      "Leaving reviews",
    ],
  },
  {
    icon: Building2,
    title: "For Providers",
    description: "Help for healthcare providers.",
    articles: [
      "Creating your practice profile",
      "Managing appointments",
      "Setting up services and pricing",
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
    description: "Communication on DocConnect.",
    articles: [
      "Sending messages",
      "Message notifications",
      "Blocking users",
      "Reporting inappropriate content",
    ],
  },
];

const popularArticles = [
  { title: "How do I reset my password?", href: "/help/reset-password", comingSoon: true },
  { title: "How to cancel an appointment", href: "/help/cancel-booking", comingSoon: true },
  { title: "Updating payment information", href: "/help/payment-info", comingSoon: true },
  { title: "How verification works for providers", href: "/help/verification", comingSoon: true },
  { title: "Understanding platform fees", href: "/help/platform-fees", comingSoon: true },
];

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Help Center</h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Find answers to your questions and learn how to get the most out of DocConnect.
        </p>

        {/* Search */}
        <div className="mx-auto flex max-w-xl gap-2">
          <div className="relative flex-1">
            <label htmlFor="help-search" className="sr-only">
              Search help articles
            </label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="help-search"
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
            <div
              key={article.title}
              className="flex items-center gap-3 rounded-lg border p-4 text-muted-foreground"
            >
              <HelpCircle className="h-5 w-5 flex-shrink-0 text-primary" />
              <span className="text-sm">{article.title}</span>
              {article.comingSoon && (
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              )}
            </div>
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
                    <li key={article} className="text-sm text-muted-foreground">
                      {article}
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
            <a href="mailto:support@docconnect.com">Email Us</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
