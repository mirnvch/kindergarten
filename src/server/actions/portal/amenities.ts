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
    include: { provider: true },
  });

  if (!providerStaff) {
    throw new Error("No daycare found");
  }

  return { user: session.user, daycare: providerStaff.provider };
}

export async function getAllAmenities() {
  return db.facility.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getDaycareAmenities() {
  const { daycare } = await requireDaycareOwner();

  const facilities = await db.providerFacility.findMany({
    where: { providerId: daycare.id },
    select: { facilityId: true },
  });

  return facilities.map((f) => f.facilityId);
}

export async function updateDaycareAmenities(facilityIds: string[]) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Delete existing facilities
    await db.providerFacility.deleteMany({
      where: { providerId: daycare.id },
    });

    // Add new facilities
    if (facilityIds.length > 0) {
      await db.providerFacility.createMany({
        data: facilityIds.map((facilityId) => ({
          providerId: daycare.id,
          facilityId,
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
