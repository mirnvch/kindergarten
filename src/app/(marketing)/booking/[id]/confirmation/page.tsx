import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowRight,
  Building2,
  Video,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { getAppointmentById } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Appointment Confirmed | DocConnect",
  description: "Your appointment has been submitted successfully",
};

export default async function ConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getAppointmentById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const appointment = result.data;
  const isTelemedicine = appointment.type === "TELEMEDICINE";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Success header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">
            Appointment Request Submitted!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your {isTelemedicine ? "telemedicine" : "in-person"} appointment request has been sent to the provider.
          </p>
        </div>

        {/* Appointment details card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Appointment Details
              </h2>
              <Badge variant="secondary">
                {appointment.status === "PENDING" ? "Pending Confirmation" : appointment.status}
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              {/* Provider */}
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{appointment.provider.name}</p>
                  {appointment.provider.specialty && (
                    <p className="text-sm text-muted-foreground">
                      {appointment.provider.specialty}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {appointment.provider.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.provider.city}, {appointment.provider.state}{" "}
                    {appointment.provider.zipCode}
                  </p>
                </div>
              </div>

              {/* Date/Time */}
              {appointment.scheduledAt && (
                <>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {formatDate(appointment.scheduledAt, {
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
                        {new Date(appointment.scheduledAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {appointment.duration || 30} minutes
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Appointment type indicator */}
              <div className="flex items-center gap-3">
                {isTelemedicine ? (
                  <Video className="h-5 w-5 text-blue-500" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {isTelemedicine ? "Telemedicine Visit" : "In-Person Visit"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isTelemedicine
                      ? "Video link will be sent before your appointment"
                      : "Please arrive 15 minutes early"}
                  </p>
                </div>
              </div>

              {/* Family Member */}
              {appointment.familyMember && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {appointment.familyMember.firstName} {appointment.familyMember.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.familyMember.relationship}
                    </p>
                  </div>
                </div>
              )}

              {/* Reason for visit */}
              {appointment.reasonForVisit && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Reason for Visit</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {appointment.reasonForVisit}
                  </p>
                </div>
              )}

              {/* Notes */}
              {appointment.notes && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Additional Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {appointment.notes}
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
                  <p className="font-medium">Provider reviews your request</p>
                  <p className="text-sm text-muted-foreground">
                    They will confirm or suggest an alternative time.
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
                    Check your appointments page or email for updates.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  3
                </div>
                <div>
                  <p className="font-medium">
                    {isTelemedicine ? "Join your video visit" : "Visit the provider"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isTelemedicine
                      ? "We'll send you a video link before your appointment."
                      : "Please bring your ID and insurance card if applicable."}
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/dashboard/appointments">
              View All Appointments
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href={`/provider/${appointment.provider.slug}`}>
              Back to {appointment.provider.name}
            </Link>
          </Button>
        </div>

        {/* Contact info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Have questions? Contact {appointment.provider.name} at{" "}
            <a
              href={`mailto:${appointment.provider.email}`}
              className="text-primary hover:underline"
            >
              {appointment.provider.email}
            </a>{" "}
            or{" "}
            <a
              href={`tel:${appointment.provider.phone}`}
              className="text-primary hover:underline"
            >
              {appointment.provider.phone}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
