import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DaycareProfileForm } from "@/components/portal/daycare-profile-form";
import { DaycarePhotosManager } from "@/components/portal/daycare-photos-manager";
import { ProgramsManager } from "@/components/portal/programs-manager";
import { ScheduleManager } from "@/components/portal/schedule-manager";
import { PricingManager } from "@/components/portal/pricing-manager";
import { AmenitiesManager } from "@/components/portal/amenities-manager";
import { StaffManager } from "@/components/portal/staff-manager";

export const metadata: Metadata = {
  title: "My Daycare | DocConnect Portal",
  description: "Manage your daycare profile",
};

async function getAllAmenities() {
  return db.amenity.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

async function getDaycare(userId: string) {
  const providerStaff = await db.providerStaff.findFirst({
    where: { userId, role: { in: ["owner", "manager"] } },
    include: {
      daycare: {
        include: {
          photos: { orderBy: { order: "asc" } },
          programs: { orderBy: { ageMin: "asc" } },
          schedule: { orderBy: { dayOfWeek: "asc" } },
          amenities: { include: { amenity: true } },
          staff: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  return providerStaff?.daycare;
}

export default async function DaycarePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [daycare, allAmenities] = await Promise.all([
    getDaycare(session.user.id),
    getAllAmenities(),
  ]);

  if (!daycare) {
    redirect("/portal/daycare/setup");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Daycare</h1>
        <p className="text-muted-foreground">
          Manage your daycare profile and settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <DaycareProfileForm daycare={daycare} />
        </TabsContent>

        <TabsContent value="photos">
          <DaycarePhotosManager photos={daycare.photos} />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramsManager programs={daycare.programs} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleManager schedule={daycare.schedule} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingManager
            pricing={{
              pricePerMonth: daycare.pricePerMonth,
              pricePerWeek: daycare.pricePerWeek,
              pricePerDay: daycare.pricePerDay,
              registrationFee: daycare.registrationFee,
            }}
          />
        </TabsContent>

        <TabsContent value="amenities">
          <AmenitiesManager
            allAmenities={allAmenities}
            selectedAmenityIds={daycare.amenities.map((a) => a.amenityId)}
          />
        </TabsContent>

        <TabsContent value="staff">
          <StaffManager staff={daycare.staff} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
