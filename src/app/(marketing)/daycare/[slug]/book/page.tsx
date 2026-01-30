import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, Clock, Calendar } from "lucide-react";

import { auth } from "@/lib/auth";
import { getDaycareBySlug } from "@/server/actions/daycare";
import { getChildren } from "@/server/actions/children";
import { getAvailableSlots } from "@/server/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils";
import { TourBookingForm } from "@/components/booking/tour-booking-form";

interface BookTourPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BookTourPageProps): Promise<Metadata> {
  const { slug } = await params;
  const daycare = await getDaycareBySlug(slug);

  if (!daycare) {
    return { title: "Daycare Not Found" };
  }

  return {
    title: `Schedule a Tour - ${daycare.name} | KinderCare`,
    description: `Book a tour at ${daycare.name} in ${daycare.city}, ${daycare.state}`,
  };
}

export default async function BookTourPage({ params }: BookTourPageProps) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    const { slug } = await params;
    redirect(`/login?callbackUrl=/daycare/${slug}/book`);
  }

  // Only parents can book tours
  if (session.user.role !== "PARENT") {
    redirect("/");
  }

  const { slug } = await params;
  const daycare = await getDaycareBySlug(slug);

  if (!daycare) {
    notFound();
  }

  // Fetch children and availability in parallel
  const [children, availability] = await Promise.all([
    getChildren(),
    getAvailableSlots(daycare.id),
  ]);

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
            <h1 className="text-3xl font-bold">Schedule a Tour</h1>
            <p className="mt-2 text-muted-foreground">
              Book a 30-minute tour to visit {daycare.name} and meet the staff.
            </p>
          </div>

          <TourBookingForm
            daycareId={daycare.id}
            daycareName={daycare.name}
            availability={availability}
            childProfiles={children}
          />
        </div>

        {/* Sidebar with daycare info */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Tour Details</CardTitle>
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
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(daycare.openingTime)} -{" "}
                    {formatTime(daycare.closingTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{daycare.operatingDays.join(", ")}</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium">What to Expect</h4>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>• Tour of the facilities</li>
                  <li>• Meet the teachers and staff</li>
                  <li>• Learn about programs and curriculum</li>
                  <li>• Ask questions about enrollment</li>
                  <li>• Review safety and security measures</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">30 min tour</Badge>
                <Badge variant="secondary">Free</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
