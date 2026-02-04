import { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  CheckCircle,
  Lock,
  Eye,
  AlertTriangle,
  UserCheck,
  FileCheck,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Trust & Safety | DocConnect",
  description: "Learn about how DocConnect keeps patients and providers safe.",
};

const trustFeatures = [
  {
    icon: UserCheck,
    title: "Provider Verification",
    description:
      "We verify healthcare providers through a multi-step process including license verification, insurance confirmation, and identity checks.",
  },
  {
    icon: FileCheck,
    title: "Credential Verification",
    description:
      "Verified providers have completed credential verification. We partner with trusted screening services to ensure patient safety.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description:
      "All payments are processed through Stripe, a PCI-compliant payment processor. Your financial information is never stored on our servers.",
  },
  {
    icon: Eye,
    title: "Review Authenticity",
    description:
      "Reviews come from verified patients who have actually used the healthcare services. We monitor for fake or misleading reviews.",
  },
];

const dataProtection = [
  {
    title: "Encryption",
    description: "All data is encrypted in transit using TLS and at rest using AES-256.",
  },
  {
    title: "Access Controls",
    description: "Strict access controls ensure only authorized personnel can access sensitive data.",
  },
  {
    title: "Regular Audits",
    description: "We conduct regular security audits and penetration testing.",
  },
  {
    title: "Data Minimization",
    description: "We only collect data that is necessary to provide our services.",
  },
];

export default function SafetyPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16 text-center">
        <Shield className="mx-auto mb-4 h-16 w-16 text-primary" />
        <h1 className="mb-4 text-4xl font-bold">Trust & Safety</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          At DocConnect, safety is our top priority. We work hard to create a trusted
          environment for patients and healthcare providers.
        </p>
      </div>

      {/* Trust Features */}
      <section className="mb-20">
        <h2 className="mb-8 text-center text-3xl font-bold">How We Build Trust</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {trustFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Verification Process */}
      <section className="mb-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold">
            Our Verification Process
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <div>
                <h3 className="font-semibold">Application Review</h3>
                <p className="text-muted-foreground">
                  Providers submit their business information, licenses, and documentation
                  for review.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div>
                <h3 className="font-semibold">License Verification</h3>
                <p className="text-muted-foreground">
                  We verify state licensing and any required certifications directly with
                  issuing authorities.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <div>
                <h3 className="font-semibold">Insurance Confirmation</h3>
                <p className="text-muted-foreground">
                  Providers must demonstrate adequate liability insurance coverage.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                4
              </div>
              <div>
                <h3 className="font-semibold">Ongoing Monitoring</h3>
                <p className="text-muted-foreground">
                  We continuously monitor for license status changes, complaints, and
                  review authenticity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="mb-20 rounded-lg bg-muted/40 px-8 py-12">
        <h2 className="mb-8 text-center text-3xl font-bold">Data Protection</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {dataProtection.map((item) => (
            <div key={item.title} className="text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <h3 className="mb-2 font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reporting */}
      <section className="mb-20">
        <div className="mx-auto max-w-3xl text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
          <h2 className="mb-4 text-3xl font-bold">Report a Concern</h2>
          <p className="mb-8 text-muted-foreground">
            If you encounter any safety concerns, inappropriate behavior, or suspicious
            activity, please report it immediately. We take all reports seriously and
            investigate thoroughly.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild>
              <Link href="/contact">Report an Issue</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:safety@docconnect.com">Email Safety Team</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Community Guidelines */}
      <section className="text-center">
        <Heart className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="mb-4 text-3xl font-bold">Community Guidelines</h2>
        <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
          We expect all users to treat each other with respect and honesty. Review our
          community guidelines to understand what behavior is expected and what is not
          tolerated on our platform.
        </p>
        <Button variant="outline" asChild>
          <Link href="/terms">Read Community Guidelines</Link>
        </Button>
      </section>
    </div>
  );
}
