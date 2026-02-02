import { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Blog | ToddlerHQ",
  description: "Tips, guides, and news about childcare and parenting from ToddlerHQ.",
};

// Placeholder articles - in production these would come from a CMS
const placeholderArticles = [
  {
    title: "5 Questions to Ask When Touring a Daycare",
    excerpt:
      "Make the most of your daycare tour with these essential questions that will help you make an informed decision.",
    date: "Coming Soon",
    category: "For Parents",
    slug: "#",
  },
  {
    title: "How to Prepare Your Child for Their First Day at Daycare",
    excerpt:
      "Starting daycare is a big transition. Here's how to make it easier for both you and your little one.",
    date: "Coming Soon",
    category: "For Parents",
    slug: "#",
  },
  {
    title: "Marketing Your Daycare in the Digital Age",
    excerpt:
      "Tips for daycare providers on how to attract more families through online marketing and social media.",
    date: "Coming Soon",
    category: "For Providers",
    slug: "#",
  },
];

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Blog</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Tips, guides, and news about childcare and parenting.
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="mb-16 rounded-lg bg-primary/5 border border-primary/20 p-8 text-center">
        <Bell className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="mb-2 text-2xl font-bold">Coming Soon!</h2>
        <p className="mb-6 text-muted-foreground">
          We&apos;re working on bringing you helpful content about childcare,
          parenting tips, and industry news. Subscribe to be notified when we
          launch.
        </p>
        <div className="mx-auto flex max-w-md gap-2">
          <Input placeholder="Enter your email" type="email" />
          <Button>Subscribe</Button>
        </div>
      </div>

      {/* Preview Articles */}
      <section>
        <h2 className="mb-8 text-2xl font-bold">Upcoming Articles</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {placeholderArticles.map((article) => (
            <Card key={article.title} className="opacity-75">
              <CardHeader>
                <div className="mb-2">
                  <Badge variant="secondary">{article.category}</Badge>
                </div>
                <CardTitle className="text-lg">{article.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {article.excerpt}
                </p>
                <p className="text-xs text-muted-foreground">{article.date}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold">Categories</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-4 py-2">
            For Parents
          </Badge>
          <Badge variant="outline" className="px-4 py-2">
            For Providers
          </Badge>
          <Badge variant="outline" className="px-4 py-2">
            Industry News
          </Badge>
          <Badge variant="outline" className="px-4 py-2">
            Tips & Guides
          </Badge>
          <Badge variant="outline" className="px-4 py-2">
            Product Updates
          </Badge>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <p className="mb-4 text-muted-foreground">
          Have a topic you&apos;d like us to cover?
        </p>
        <Button variant="outline" asChild>
          <Link href="/contact">Suggest a Topic</Link>
        </Button>
      </section>
    </div>
  );
}
