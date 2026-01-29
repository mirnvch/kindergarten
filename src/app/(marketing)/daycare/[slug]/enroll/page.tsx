import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, Users, Calendar, DollarSign } from "lucide-react";

import { auth } from "@/lib/auth";
import { getDaycareBySlug } from "@/server/actions/daycare";
import { getChildren } from "@/server/actions/children";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAgeRange, formatCurrency } from "@/lib/utils";
import { EnrollmentForm } from "@/components/booking/enrollment-form";
import type { DaycareProgram } from "@/types";

interface EnrollPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EnrollPageProps): Promise<Metadata> {
  const { slug } = await params;
  const daycare = await getDaycareBySlug(slug);

  if (!daycare) {
    return { title: "Daycare Not Found" };
  }

  return {
    title: `Apply for Enrollment - ${daycare.name} | KinderCare`,
    description: `Apply for enrollment at ${daycare.name} in ${daycare.city}, ${daycare.state}`,
  };
}

export default async function EnrollPage({ params }: EnrollPageProps) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    const { slug } = await params;
    redirect(`/login?callbackUrl=/daycare/${slug}/enroll`);
  }

  // Only parents can apply for enrollment
  if (session.user.role !== "PARENT") {
    redirect("/");
  }

  const { slug } = await params;
  const daycare = await getDaycareBySlug(slug);

  if (!daycare) {
    notFound();
  }

  // Fetch children
  const children = await getChildren();

  // Transform programs to match the expected format
  const programs = daycare.programs.map((p: DaycareProgram) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    ageMin: p.ageMin,
    ageMax: p.ageMax,
    price: Number(p.price),
    schedule: p.schedule,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href={`/daycare/${slug}`}
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to {daycare.name}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Apply for Enrollment</h1>
            <p className="mt-2 text-muted-foreground">
              Submit an enrollment request to {daycare.name}. The daycare will
              review your application and contact you.
            </p>
          </div>

          <EnrollmentForm
            daycareId={daycare.id}
            daycareName={daycare.name}
            programs={programs}
            children={children}
          />
        </div>

        {/* Sidebar with daycare info */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Daycare Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{daycare.name}</h3>
                <div className="mt-1 flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-4 w-4" />
                  {daycare.city}, {daycare.state}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Capacity: {daycare.capacity} children</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Ages: {formatAgeRange(daycare.minAge, daycare.maxAge)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>From {formatCurrency(daycare.pricePerMonth)}/month</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium">What Happens Next?</h4>
                <ol className="mt-2 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                  <li>Submit your enrollment request</li>
                  <li>Daycare reviews your application</li>
                  <li>They contact you to discuss details</li>
                  <li>Schedule a tour if you haven&apos;t already</li>
                  <li>Complete enrollment paperwork</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">No commitment</Badge>
                <Badge variant="secondary">Free to apply</Badge>
              </div>

              {daycare.registrationFee && Number(daycare.registrationFee) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Note: A registration fee of{" "}
                  {formatCurrency(Number(daycare.registrationFee))} may apply
                  upon acceptance.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
