"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireDaycareOwner() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const providerStaff = await db.providerStaff.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["owner", "manager"] },
    },
    include: { daycare: true },
  });

  if (!providerStaff) {
    throw new Error("No daycare found");
  }

  return { user: session.user, daycare: providerStaff.daycare };
}

export async function getAllAmenities() {
  return db.amenity.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getDaycareAmenities() {
  const { daycare } = await requireDaycareOwner();

  const amenities = await db.providerAmenity.findMany({
    where: { providerId: daycare.id },
    select: { amenityId: true },
  });

  return amenities.map((a) => a.amenityId);
}

export async function updateDaycareAmenities(amenityIds: string[]) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Delete existing amenities
    await db.providerAmenity.deleteMany({
      where: { providerId: daycare.id },
    });

    // Add new amenities
    if (amenityIds.length > 0) {
      await db.providerAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          providerId: daycare.id,
          amenityId,
        })),
      });
    }

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error updating amenities:", error);
    return { success: false, error: "Failed to update amenities" };
  }
}
