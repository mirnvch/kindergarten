import { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MessageCircle,
  Mail,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Community | DocConnect",
  description: "Join the DocConnect community of patients and healthcare providers.",
};

const socialLinks = [
  {
    name: "Twitter",
    href: "https://twitter.com/docconnect",
    description: "Follow us for updates and health tips",
    icon: "𝕏",
  },
  {
    name: "Facebook",
    href: "https://facebook.com/docconnect",
    description: "Join our community group for discussions",
    icon: "f",
  },
  {
    name: "Instagram",
    href: "https://instagram.com/docconnect",
    description: "Behind the scenes and health insights",
    icon: "📷",
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/docconnect",
    description: "Connect with us professionally",
    icon: "in",
  },
];

const communityFeatures = [
  {
    icon: Users,
    title: "Patient Groups",
    description:
      "Connect with other patients in your area. Share experiences, ask questions, and build relationships.",
  },
  {
    icon: MessageCircle,
    title: "Provider Network",
    description:
      "For healthcare providers: connect with peers, share best practices, and learn from the community.",
  },
  {
    icon: Heart,
    title: "Events & Meetups",
    description:
      "Join local events and meetups organized by the DocConnect community.",
  },
];

export default function CommunityPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-primary" />
        <h1 className="mb-4 text-4xl font-bold">Join Our Community</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Connect with patients and healthcare providers who share your commitment
          to quality healthcare.
        </p>
      </div>

      {/* Social Links */}
      <section className="mb-20">
        <h2 className="mb-8 text-center text-2xl font-bold">Follow Us</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {socialLinks.map((social) => (
            <Card key={social.name}>
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {social.icon}
                </div>
                <h3 className="mb-2 font-semibold">{social.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {social.description}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Follow
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Community Features */}
      <section className="mb-20">
        <h2 className="mb-8 text-center text-2xl font-bold">Community Features</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {communityFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="text-center">
                <feature.icon className="mx-auto mb-2 h-10 w-10 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Community features coming soon!
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="rounded-lg bg-muted/40 px-8 py-12">
        <div className="mx-auto max-w-xl text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-4 text-2xl font-bold">Stay Updated</h2>
          <p className="mb-6 text-muted-foreground">
            Subscribe to our newsletter for health tips, platform updates, and
            community news.
          </p>
          <div className="flex gap-2">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter-email"
              placeholder="Enter your email"
              type="email"
              className="flex-1"
            />
            <Button>Subscribe</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mt-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Have Ideas?</h2>
        <p className="mb-6 text-muted-foreground">
          We&apos;d love to hear your suggestions for building a better community.
        </p>
        <Button variant="outline" asChild>
          <Link href="/contact">Share Your Ideas</Link>
        </Button>
      </section>
    </div>
  );
}
