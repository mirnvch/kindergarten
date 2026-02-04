import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, Clock, Calendar } from "lucide-react";

import { auth } from "@/lib/auth";
import { getProviderBySlug } from "@/server/actions/provider";
import { getFamilyMembers } from "@/server/actions/family-members";
import { getAvailableSlots } from "@/server/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils";
import { AppointmentBookingForm } from "@/components/booking/appointment-booking-form";

interface BookAppointmentPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BookAppointmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    return { title: "Provider Not Found" };
  }

  return {
    title: `Book Appointment - ${provider.name} | DocConnect`,
    description: `Book an appointment with ${provider.name} in ${provider.city}, ${provider.state}`,
  };
}

export default async function BookAppointmentPage({ params }: BookAppointmentPageProps) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    const { slug } = await params;
    redirect(`/login?callbackUrl=/provider/${slug}/book`);
  }

  // Only patients can book appointments
  if (session.user.role !== "PATIENT") {
    redirect("/");
  }

  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    notFound();
  }

  // Fetch family members and availability in parallel
  const [familyMembersResult, availabilityResult] = await Promise.all([
    getFamilyMembers(),
    getAvailableSlots(provider.id),
  ]);

  const familyMembers = familyMembersResult.success ? familyMembersResult.data ?? [] : [];
  const availability = availabilityResult.success ? availabilityResult.data ?? [] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href={`/provider/${slug}`}
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to {provider.name}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Book an Appointment</h1>
            <p className="mt-2 text-muted-foreground">
              Schedule an appointment with {provider.name}
              {provider.specialty && ` - ${provider.specialty}`}.
            </p>
          </div>

          <AppointmentBookingForm
            providerId={provider.id}
            providerName={provider.name}
            availability={availability}
            familyMembers={familyMembers}
            offersTelehealth={provider.offersTelehealth}
          />
        </div>

        {/* Sidebar with provider info */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{provider.name}</h3>
                {provider.specialty && (
                  <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                )}
                <div className="mt-1 flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-4 w-4" />
                  {provider.city}, {provider.state}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(provider.openingTime)} -{" "}
                    {formatTime(provider.closingTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{provider.operatingDays?.join(", ") || "Mon-Fri"}</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium">What to Bring</h4>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>• Photo ID</li>
                  <li>• Insurance card (if applicable)</li>
                  <li>• List of current medications</li>
                  <li>• Any relevant medical records</li>
                  <li>• Questions for your provider</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                {provider.offersTelehealth && (
                  <Badge variant="secondary">Telehealth Available</Badge>
                )}
                {provider.consultationFee && (
                  <Badge variant="secondary">${Number(provider.consultationFee)} visit</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
