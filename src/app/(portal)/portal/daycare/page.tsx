import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderProfileForm } from "@/components/portal/provider-profile-form";
import { ProviderPhotosManager } from "@/components/portal/provider-photos-manager";
import { ProgramsManager } from "@/components/portal/programs-manager";
import { ScheduleManager } from "@/components/portal/schedule-manager";
import { PricingManager } from "@/components/portal/pricing-manager";
import { AmenitiesManager } from "@/components/portal/amenities-manager";
import { StaffManager } from "@/components/portal/staff-manager";

export const metadata: Metadata = {
  title: "My Practice | DocConnect Portal",
  description: "Manage your provider profile",
};

async function getAllFacilities() {
  return db.facility.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

async function getProvider(userId: string) {
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

export default async function ProviderPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [provider, allFacilities] = await Promise.all([
    getProvider(session.user.id),
    getAllFacilities(),
  ]);

  if (!provider) {
    redirect("/portal/daycare/setup");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Practice</h1>
        <p className="text-muted-foreground">
          Manage your provider profile and settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProviderProfileForm provider={provider} />
        </TabsContent>

        <TabsContent value="photos">
          <ProviderPhotosManager photos={provider.photos} />
        </TabsContent>

        <TabsContent value="services">
          <ProgramsManager services={provider.services} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleManager schedule={provider.schedule} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingManager
            pricing={{
              consultationFee: provider.consultationFee,
              telehealthFee: provider.telehealthFee,
              acceptsUninsured: provider.acceptsUninsured,
              slidingScalePricing: provider.slidingScalePricing,
            }}
          />
        </TabsContent>

        <TabsContent value="facilities">
          <AmenitiesManager
            allAmenities={allFacilities}
            selectedAmenityIds={provider.facilities.map((f) => f.facilityId)}
          />
        </TabsContent>

        <TabsContent value="staff">
          <StaffManager staff={provider.staff} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
