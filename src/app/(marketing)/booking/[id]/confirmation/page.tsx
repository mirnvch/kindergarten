import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Baby,
  ArrowRight,
  Home,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { getBookingById } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Booking Confirmed | KinderCare",
  description: "Your booking has been submitted successfully",
};

export default async function ConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking) {
    notFound();
  }

  const isTour = booking.type === "TOUR";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Success header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">
            {isTour ? "Tour Request Submitted!" : "Enrollment Request Submitted!"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isTour
              ? "Your tour request has been sent to the daycare."
              : "Your enrollment application has been sent to the daycare."}
          </p>
        </div>

        {/* Booking details card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isTour ? "Tour Details" : "Enrollment Details"}
              </h2>
              <Badge variant="secondary">
                {booking.status === "PENDING" ? "Pending Confirmation" : booking.status}
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              {/* Daycare */}
              <div className="flex items-start gap-3">
                <Home className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{booking.daycare.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.daycare.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.daycare.city}, {booking.daycare.state}{" "}
                    {booking.daycare.zipCode}
                  </p>
                </div>
              </div>

              {/* Date/Time for tours */}
              {isTour && booking.scheduledAt && (
                <>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {formatDate(booking.scheduledAt, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(booking.scheduledAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {booking.duration || 30} minutes
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Desired start date for enrollments */}
              {!isTour && booking.scheduledAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Desired Start Date</p>
                    <p className="font-medium">
                      {formatDate(booking.scheduledAt, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Child */}
              {booking.child && (
                <div className="flex items-center gap-3">
                  <Baby className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {booking.child.firstName} {booking.child.lastName}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Additional Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* What's next section */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="mb-4 text-lg font-semibold">What&apos;s Next?</h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  1
                </div>
                <div>
                  <p className="font-medium">
                    {isTour ? "Daycare reviews your request" : "Application review"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isTour
                      ? "They will confirm or suggest an alternative time."
                      : "The daycare will review your enrollment application."}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  2
                </div>
                <div>
                  <p className="font-medium">You&apos;ll get notified</p>
                  <p className="text-sm text-muted-foreground">
                    Check your bookings page or email for updates.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  3
                </div>
                <div>
                  <p className="font-medium">
                    {isTour ? "Visit the daycare" : "Complete enrollment"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isTour
                      ? "Meet the staff and tour the facilities."
                      : "Work with the daycare to finalize paperwork and start date."}
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/parent/bookings">
              View All Bookings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href={`/daycare/${booking.daycare.slug}`}>
              Back to {booking.daycare.name}
            </Link>
          </Button>
        </div>

        {/* Contact info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Have questions? Contact {booking.daycare.name} at{" "}
            <a
              href={`mailto:${booking.daycare.email}`}
              className="text-primary hover:underline"
            >
              {booking.daycare.email}
            </a>{" "}
            or{" "}
            <a
              href={`tel:${booking.daycare.phone}`}
              className="text-primary hover:underline"
            >
              {booking.daycare.phone}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
