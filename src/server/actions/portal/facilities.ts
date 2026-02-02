"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireProviderOwner() {
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
    throw new Error("No practice found");
  }

  return { user: session.user, provider: providerStaff.provider };
}

export async function getAllFacilities() {
  return db.facility.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getProviderFacilities() {
  const { provider } = await requireProviderOwner();

  const facilities = await db.providerFacility.findMany({
    where: { providerId: provider.id },
    select: { facilityId: true },
  });

  return facilities.map((f) => f.facilityId);
}

export async function updateProviderFacilities(facilityIds: string[]) {
  try {
    const { provider } = await requireProviderOwner();

    // Delete existing facilities
    await db.providerFacility.deleteMany({
      where: { providerId: provider.id },
    });

    // Add new facilities
    if (facilityIds.length > 0) {
      await db.providerFacility.createMany({
        data: facilityIds.map((facilityId) => ({
          providerId: provider.id,
          facilityId,
        })),
      });
    }

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    console.error("Error updating facilities:", error);
    return { success: false, error: "Failed to update facilities" };
  }
}
