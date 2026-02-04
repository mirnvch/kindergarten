import { Metadata } from "next";
import { Download, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Press | DocConnect",
  description: "Press resources and media kit for DocConnect.",
};

const companyFacts = [
  { label: "Founded", value: "2024" },
  { label: "Headquarters", value: "San Francisco, CA" },
  { label: "Mission", value: "Connecting patients with quality healthcare" },
  { label: "Platform", value: "Web & Mobile" },
];

const pressReleases: {
  title: string;
  date: string;
  excerpt: string;
  link: string;
}[] = [
  // Add press releases as they come
  // {
  //   title: "DocConnect Launches in San Francisco",
  //   date: "January 2024",
  //   excerpt: "DocConnect launches its healthcare discovery platform...",
  //   link: "#",
  // },
];

export default function PressPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Press & Media</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Resources for journalists and media professionals writing about DocConnect.
        </p>
      </div>

      {/* Company Info */}
      <section className="mb-16">
        <h2 className="mb-8 text-2xl font-bold">About DocConnect</h2>
        <div className="mb-8">
          <p className="text-muted-foreground">
            DocConnect is a platform that connects patients with trusted healthcare
            providers. We make it easy to find, compare, and book
            quality healthcare, while helping providers grow their practice
            and manage operations efficiently.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {companyFacts.map((fact) => (
            <Card key={fact.label}>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{fact.label}</p>
                <p className="font-semibold">{fact.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Brand Assets */}
      <section className="mb-16">
        <h2 className="mb-8 text-2xl font-bold">Brand Assets</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Logo Pack</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Download our logo in various formats (PNG, SVG) for light and
                dark backgrounds.
              </p>
              <div className="mb-4 flex h-24 items-center justify-center rounded-lg bg-muted">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <span className="text-2xl font-bold text-primary-foreground">
                    D
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Learn about our brand colors, typography, and usage guidelines.
              </p>
              <div className="mb-4 flex gap-2">
                <div className="h-12 w-12 rounded bg-primary" title="Primary" />
                <div className="h-12 w-12 rounded bg-secondary" title="Secondary" />
                <div className="h-12 w-12 rounded bg-muted" title="Muted" />
                <div className="h-12 w-12 rounded border bg-background" title="Background" />
              </div>
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Press Releases */}
      <section className="mb-16">
        <h2 className="mb-8 text-2xl font-bold">Press Releases</h2>
        {pressReleases.length > 0 ? (
          <div className="space-y-4">
            {pressReleases.map((release) => (
              <Card key={release.title}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{release.date}</p>
                    <h3 className="font-semibold">{release.title}</h3>
                    <p className="text-sm text-muted-foreground">{release.excerpt}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={release.link}
                      aria-label={`Read press release: ${release.title}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No press releases yet. Check back soon!
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Media Contact */}
      <section className="rounded-lg bg-muted/40 px-8 py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Media Contact</h2>
        <p className="mb-6 text-muted-foreground">
          For press inquiries, interviews, or additional information, please
          contact our communications team.
        </p>
        <Button asChild>
          <a href="mailto:press@docconnect.com">
            <Mail className="mr-2 h-4 w-4" />
            press@docconnect.com
          </a>
        </Button>
      </section>
    </div>
  );
}
