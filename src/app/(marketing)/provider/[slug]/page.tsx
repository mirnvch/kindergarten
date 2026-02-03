import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Calendar,
  Star,
  BadgeCheck,
  ChevronLeft,
  Stethoscope,
  Video,
  Languages,
} from "lucide-react";

import { getProviderBySlug } from "@/server/actions/provider";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatTime } from "@/lib/utils";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { canUserReview } from "@/server/actions/reviews";
import { ContactProviderButton } from "@/components/provider/contact-button";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import type { ProviderPhoto, ProviderService, ProviderReview, Facility } from "@/types";

interface ProviderPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300; // 5 minutes

export async function generateMetadata({
  params,
}: ProviderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    return { title: "Provider Not Found" };
  }

  return {
    title: `${provider.name} | DocConnect`,
    description:
      provider.metaDescription ||
      provider.description ||
      `${provider.name} - ${provider.specialty || "Healthcare Provider"} in ${provider.city}, ${provider.state}`,
  };
}

export default async function ProviderPage({ params }: ProviderPageProps) {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    notFound();
  }

  const [reviewStatus, session] = await Promise.all([
    canUserReview(provider.id),
    auth(),
  ]);

  const primaryPhoto = provider.photos?.find((p: ProviderPhoto) => p.isPrimary) || provider.photos?.[0];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Analytics tracking */}
      <PageViewTracker providerId={provider.id} />

      {/* Back link */}
      <Link
        href="/search"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to search
      </Link>

      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Photo gallery */}
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-muted">
            {primaryPhoto ? (
              <Image
                src={primaryPhoto.url}
                alt={provider.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Stethoscope className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Thumbnail gallery */}
          {provider.photos && provider.photos.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {provider.photos.slice(0, 6).map((photo: ProviderPhoto, index: number) => (
                <div
                  key={photo.id}
                  className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0"
                >
                  <Image
                    src={photo.url}
                    alt={`${provider.name} photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {provider.photos.length > 6 && (
                <div className="w-24 h-24 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-muted-foreground">
                    +{provider.photos.length - 6} more
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Info tabs */}
          <Tabs defaultValue="about" className="mt-8">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({provider.reviewCount || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6">
              <div className="space-y-6">
                {provider.description && (
                  <div>
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {provider.description}
                    </p>
                  </div>
                )}

                {provider.education && (
                  <div>
                    <h3 className="font-semibold mb-2">Education & Training</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {provider.education}
                    </p>
                  </div>
                )}

                {provider.facilities && provider.facilities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Facilities</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.facilities.map((pf: Facility | { facility: Facility }) => {
                        // Handle both direct facility and junction table format
                        const facility = "facility" in pf ? pf.facility : pf;
                        return (
                          <Badge key={facility.id} variant="secondary">
                            {facility.icon && <span className="mr-1">{facility.icon}</span>}
                            {facility.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Office Hours</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                </div>

                {provider.acceptedInsurance && provider.acceptedInsurance.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Accepted Insurance</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.acceptedInsurance.map((insurance: string) => (
                        <Badge key={insurance} variant="outline">
                          {insurance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              {(!provider.services || provider.services.length === 0) ? (
                <p className="text-muted-foreground">
                  No services listed yet.
                </p>
              ) : (
                <div className="grid gap-4">
                  {provider.services.map((service: ProviderService) => (
                    <Card key={service.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {service.name}
                            </CardTitle>
                            {service.isTelehealth && (
                              <Badge variant="secondary" className="text-xs">
                                <Video className="h-3 w-3 mr-1" />
                                Telehealth
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-primary">
                            ${Number(service.price)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground mb-2">
                          Duration: {service.duration} minutes
                        </div>
                        {service.description && (
                          <p className="text-sm">{service.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <ReviewsSection
                providerId={provider.id}
                providerName={provider.name}
                providerSlug={provider.slug}
                reviews={(provider.reviews || []).map((r: ProviderReview) => ({
                  ...r,
                  createdAt: r.createdAt,
                }))}
                reviewCount={provider.reviewCount || 0}
                avgRating={provider.rating || 0}
                canReview={reviewStatus.canReview}
                canReviewReason={reviewStatus.reason}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="pt-6">
              {/* Name and verification */}
              <div className="flex items-start gap-2 mb-4">
                <h1 className="text-2xl font-bold">{provider.name}</h1>
                {provider.isVerified && (
                  <BadgeCheck className="h-6 w-6 text-blue-500 flex-shrink-0" />
                )}
              </div>

              {/* Specialty & Credentials */}
              {(provider.specialty || provider.credentials) && (
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {provider.specialty}
                    {provider.credentials && `, ${provider.credentials}`}
                  </span>
                </div>
              )}

              {/* Rating */}
              {provider.rating && provider.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 font-semibold">{provider.rating}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({provider.reviewCount || 0} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              {provider.consultationFee && (
                <div className="mb-6">
                  <div className="text-3xl font-bold text-primary">
                    ${Number(provider.consultationFee)}
                    <span className="text-base font-normal text-muted-foreground">
                      /visit
                    </span>
                  </div>
                  {provider.telehealthFee && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <Video className="inline h-3 w-3 mr-1" />
                      Telehealth: ${Number(provider.telehealthFee)}
                    </div>
                  )}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-3 mb-6">
                <Button className="w-full" size="lg" asChild>
                  <Link href={`/provider/${provider.slug}/book`}>
                    Book Appointment
                  </Link>
                </Button>
                <ContactProviderButton
                  providerId={provider.id}
                  providerName={provider.name}
                  isAuthenticated={!!session?.user}
                />
              </div>

              <Separator className="my-6" />

              {/* Quick facts */}
              <div className="space-y-4 text-sm">
                {provider.acceptingNewPatients !== false && (
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Accepting New Patients
                    </Badge>
                  </div>
                )}

                {provider.offersTelehealth && (
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <span>Telehealth Available</span>
                  </div>
                )}

                {provider.languages && provider.languages.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Languages className="h-5 w-5 text-muted-foreground" />
                    <span>{provider.languages.join(", ")}</span>
                  </div>
                )}

                {provider.experience && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>{provider.experience} years experience</span>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Contact info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div>{provider.address}</div>
                    <div>
                      {provider.city}, {provider.state} {provider.zipCode}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={`tel:${provider.phone}`}
                    className="hover:text-primary"
                  >
                    {provider.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={`mailto:${provider.email}`}
                    className="hover:text-primary"
                  >
                    {provider.email}
                  </a>
                </div>
                {provider.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
