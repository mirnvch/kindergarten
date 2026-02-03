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

async function getAllFacilities() {
  return db.facility.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

async function getDaycare(userId: string) {
  const providerStaff = await db.providerStaff.findFirst({
    where: { userId, role: { in: ["owner", "manager"] } },
    include: {
      provider: {
        include: {
          photos: { orderBy: { order: "asc" } },
          services: { orderBy: { name: "asc" } },
          schedule: { orderBy: { dayOfWeek: "asc" } },
          facilities: { include: { facility: true } },
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

  return providerStaff?.provider;
}

export default async function DaycarePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [daycare, allFacilities] = await Promise.all([
    getDaycare(session.user.id),
    getAllFacilities(),
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
          <ProgramsManager services={daycare.services} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleManager schedule={daycare.schedule} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingManager
            pricing={{
              consultationFee: daycare.consultationFee,
              telehealthFee: daycare.telehealthFee,
              acceptsUninsured: daycare.acceptsUninsured,
              slidingScalePricing: daycare.slidingScalePricing,
            }}
          />
        </TabsContent>

        <TabsContent value="amenities">
          <AmenitiesManager
            allAmenities={allFacilities}
            selectedAmenityIds={daycare.facilities.map((f) => f.facilityId)}
          />
        </TabsContent>

        <TabsContent value="staff">
          <StaffManager staff={daycare.staff} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
