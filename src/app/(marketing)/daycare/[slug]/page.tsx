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
  Users,
  Calendar,
  Star,
  BadgeCheck,
  ChevronLeft,
} from "lucide-react";

import { getDaycareBySlug } from "@/server/actions/daycare";
import { isDaycareFull } from "@/server/actions/waitlist";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatTime, formatAgeRange, getInitials } from "@/lib/utils";
import type {
  DaycarePhoto,
  DaycareProgram,
  DaycareReview,
  Amenity,
} from "@/types";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { canUserReview } from "@/server/actions/reviews";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { ContactDaycareButton } from "@/components/daycare/contact-button";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

interface DaycarePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Enable ISR (Incremental Static Regeneration).
 * Daycare pages are revalidated every 5 minutes.
 * This balances freshness with performance.
 */
export const revalidate = 300; // 5 minutes

export async function generateMetadata({
  params,
}: DaycarePageProps): Promise<Metadata> {
  const { slug } = await params;
  const daycare = await getDaycareBySlug(slug);

  if (!daycare) {
    return { title: "Daycare Not Found" };
  }

  return {
    title: `${daycare.name} | KinderCare`,
    description:
      daycare.metaDescription ||
      daycare.description ||
      `${daycare.name} - Quality childcare in ${daycare.city}, ${daycare.state}`,
  };
}

export default async function DaycarePage({ params }: DaycarePageProps) {
  const { slug } = await params;
  const daycare = await getDaycareBySlug(slug);

  if (!daycare) {
    notFound();
  }

  const [reviewStatus, capacityStatus, session] = await Promise.all([
    canUserReview(daycare.id),
    isDaycareFull(daycare.id),
    auth(),
  ]);

  const primaryPhoto = daycare.photos.find((p: DaycarePhoto) => p.isPrimary) || daycare.photos[0];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Analytics tracking */}
      <PageViewTracker daycareId={daycare.id} />

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
                alt={daycare.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-muted-foreground">No photos available</span>
              </div>
            )}
          </div>

          {/* Thumbnail gallery */}
          {daycare.photos.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {daycare.photos.slice(0, 6).map((photo: DaycarePhoto, index: number) => (
                <div
                  key={photo.id}
                  className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0"
                >
                  <Image
                    src={photo.url}
                    alt={`${daycare.name} photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {daycare.photos.length > 6 && (
                <div className="w-24 h-24 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-muted-foreground">
                    +{daycare.photos.length - 6} more
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Info tabs */}
          <Tabs defaultValue="about" className="mt-8">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({daycare.reviewCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6">
              <div className="space-y-6">
                {daycare.description && (
                  <div>
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {daycare.description}
                    </p>
                  </div>
                )}

                {daycare.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {daycare.amenities.map((amenity: Amenity) => (
                        <Badge key={amenity.id} variant="secondary">
                          {amenity.icon && <span className="mr-1">{amenity.icon}</span>}
                          {amenity.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Schedule</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="programs" className="mt-6">
              {daycare.programs.length === 0 ? (
                <p className="text-muted-foreground">
                  No programs listed yet.
                </p>
              ) : (
                <div className="grid gap-4">
                  {daycare.programs.map((program: DaycareProgram) => (
                    <Card key={program.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">
                            {program.name}
                          </CardTitle>
                          <span className="font-semibold text-primary">
                            ${program.price}/mo
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground mb-2">
                          Ages: {formatAgeRange(program.ageMin, program.ageMax)}
                          {program.schedule && ` | ${program.schedule}`}
                        </div>
                        {program.description && (
                          <p className="text-sm">{program.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <ReviewsSection
                daycareId={daycare.id}
                daycareName={daycare.name}
                daycareSlug={daycare.slug}
                reviews={daycare.reviews.map((r: DaycareReview) => ({
                  ...r,
                  createdAt: r.createdAt,
                }))}
                reviewCount={daycare.reviewCount}
                avgRating={daycare.rating}
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
                <h1 className="text-2xl font-bold">{daycare.name}</h1>
                {daycare.isVerified && (
                  <BadgeCheck className="h-6 w-6 text-blue-500 flex-shrink-0" />
                )}
              </div>

              {/* Rating */}
              {daycare.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 font-semibold">{daycare.rating}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({daycare.reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                <div className="text-3xl font-bold text-primary">
                  ${daycare.pricePerMonth.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground">
                    /month
                  </span>
                </div>
                {(daycare.pricePerWeek || daycare.pricePerDay) && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {daycare.pricePerWeek && (
                      <span>${daycare.pricePerWeek}/week</span>
                    )}
                    {daycare.pricePerWeek && daycare.pricePerDay && " | "}
                    {daycare.pricePerDay && (
                      <span>${daycare.pricePerDay}/day</span>
                    )}
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3 mb-6">
                <Button className="w-full" size="lg" asChild>
                  <Link href={`/daycare/${daycare.slug}/book`}>
                    Schedule a Tour
                  </Link>
                </Button>
                {capacityStatus.isFull ? (
                  <WaitlistForm
                    daycareId={daycare.id}
                    daycareName={daycare.name}
                    defaultEmail={session?.user?.email || ""}
                    defaultName={session?.user?.firstName ? `${session.user.firstName} ${session.user.lastName}` : ""}
                    spotsAvailable={capacityStatus.spotsAvailable}
                    capacity={capacityStatus.capacity}
                    enrolled={capacityStatus.enrolled}
                  />
                ) : (
                  <Button variant="outline" className="w-full" size="lg" asChild>
                    <Link href={`/daycare/${daycare.slug}/enroll`}>
                      Apply for Enrollment
                    </Link>
                  </Button>
                )}
                <ContactDaycareButton
                  daycareId={daycare.id}
                  daycareName={daycare.name}
                  isAuthenticated={!!session?.user}
                />
              </div>

              <Separator className="my-6" />

              {/* Quick facts */}
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Capacity</div>
                    <div className="text-muted-foreground">
                      {capacityStatus.enrolled}/{capacityStatus.capacity} children
                      {capacityStatus.isFull ? (
                        <Badge variant="destructive" className="ml-2 text-xs">Full</Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {capacityStatus.spotsAvailable} spots left
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Ages</div>
                    <div className="text-muted-foreground">
                      {formatAgeRange(daycare.minAge, daycare.maxAge)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Hours</div>
                    <div className="text-muted-foreground">
                      {formatTime(daycare.openingTime)} -{" "}
                      {formatTime(daycare.closingTime)}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Contact info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div>{daycare.address}</div>
                    <div>
                      {daycare.city}, {daycare.state} {daycare.zipCode}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={`tel:${daycare.phone}`}
                    className="hover:text-primary"
                  >
                    {daycare.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={`mailto:${daycare.email}`}
                    className="hover:text-primary"
                  >
                    {daycare.email}
                  </a>
                </div>
                {daycare.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={daycare.website}
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
