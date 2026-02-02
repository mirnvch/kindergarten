import { Metadata } from "next";
import Link from "next/link";
import {
  Heart,
  Zap,
  Users,
  Globe,
  Coffee,
  Laptop,
  Plane,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Careers | ToddlerHQ",
  description: "Join the ToddlerHQ team and help families find quality childcare.",
};

const values = [
  {
    icon: Heart,
    title: "Family First",
    description: "We're building products that make life easier for families and caregivers.",
  },
  {
    icon: Zap,
    title: "Move Fast",
    description: "We ship quickly, learn from feedback, and iterate constantly.",
  },
  {
    icon: Users,
    title: "Team Players",
    description: "We collaborate openly and support each other to achieve our goals.",
  },
  {
    icon: Globe,
    title: "Think Big",
    description: "We're on a mission to transform childcare discovery globally.",
  },
];

const benefits = [
  { icon: Coffee, title: "Flexible Hours", description: "Work when you're most productive" },
  { icon: Laptop, title: "Remote First", description: "Work from anywhere in the world" },
  { icon: Plane, title: "Unlimited PTO", description: "Take time off when you need it" },
  { icon: GraduationCap, title: "Learning Budget", description: "$1,000/year for courses and books" },
];

const openPositions: {
  title: string;
  department: string;
  location: string;
  type: string;
}[] = [
  // Currently no open positions - uncomment and add when hiring
  // {
  //   title: "Senior Full-Stack Engineer",
  //   department: "Engineering",
  //   location: "Remote",
  //   type: "Full-time",
  // },
  // {
  //   title: "Product Designer",
  //   department: "Design",
  //   location: "Remote",
  //   type: "Full-time",
  // },
];

export default function CareersPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Join Our Team</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          We&apos;re on a mission to help every family find quality childcare.
          Join us in making a difference.
        </p>
      </div>

      {/* Values */}
      <section className="mb-20">
        <h2 className="mb-8 text-center text-3xl font-bold">Our Values</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => (
            <Card key={value.title}>
              <CardHeader className="text-center">
                <value.icon className="mx-auto mb-2 h-10 w-10 text-primary" />
                <CardTitle>{value.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-sm text-muted-foreground">
                  {value.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mb-20 rounded-lg bg-muted/40 px-8 py-12">
        <h2 className="mb-8 text-center text-3xl font-bold">Benefits & Perks</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="text-center">
              <benefit.icon className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section className="mb-20">
        <h2 className="mb-8 text-center text-3xl font-bold">Open Positions</h2>
        {openPositions.length > 0 ? (
          <div className="mx-auto max-w-3xl space-y-4">
            {openPositions.map((position) => (
              <Card key={position.title}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="font-semibold">{position.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{position.department}</Badge>
                      <Badge variant="outline">{position.location}</Badge>
                      <Badge variant="outline">{position.type}</Badge>
                    </div>
                  </div>
                  <Button>Apply</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl text-center">
            <div className="mb-4 text-6xl">🎯</div>
            <h3 className="mb-2 text-xl font-semibold">
              No Open Positions Right Now
            </h3>
            <p className="mb-6 text-muted-foreground">
              We don&apos;t have any open positions at the moment, but we&apos;re always
              interested in hearing from talented people. Send us your resume and
              we&apos;ll keep you in mind for future opportunities.
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:careers@toddlerhq.com">Send Your Resume</a>
            </Button>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="mb-4 text-2xl font-bold">Questions?</h2>
        <p className="mb-6 text-muted-foreground">
          Reach out to our team at{" "}
          <a
            href="mailto:careers@toddlerhq.com"
            className="text-primary hover:underline"
          >
            careers@toddlerhq.com
          </a>
        </p>
        <Button variant="outline" asChild>
          <Link href="/about">Learn More About Us</Link>
        </Button>
      </section>
    </div>
  );
}
