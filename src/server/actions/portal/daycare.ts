"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { slugify } from "@/lib/utils";

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

export async function getDaycare() {
  const { daycare } = await requireDaycareOwner();

  const fullDaycare = await db.provider.findUnique({
    where: { id: daycare.id },
    include: {
      photos: { orderBy: { order: "asc" } },
      programs: true,
      amenities: { include: { amenity: true } },
      schedule: true,
    },
  });

  return fullDaycare;
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Zip code is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  minAge: z.number().min(0, "Min age must be at least 0"),
  maxAge: z.number().min(1, "Max age must be at least 1"),
});

const createDaycareSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Zip code is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  minAge: z.number().min(0, "Min age must be at least 0"),
  maxAge: z.number().min(1, "Max age must be at least 1"),
  openingTime: z.string().default("07:00"),
  closingTime: z.string().default("18:00"),
  pricePerMonth: z.number().min(0, "Price must be positive"),
});

export async function createDaycare(data: z.infer<typeof createDaycareSchema>) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if user already has a daycare
  const existingStaff = await db.providerStaff.findFirst({
    where: { userId: session.user.id },
  });

  if (existingStaff) {
    return { success: false, error: "You already have a daycare" };
  }

  try {
    const validated = createDaycareSchema.parse(data);

    // Generate unique slug with safety limit
    const baseSlug = slugify(validated.name);
    let slug = baseSlug;
    let counter = 1;
    const maxAttempts = 100;

    while (await db.provider.findUnique({ where: { slug } })) {
      if (counter > maxAttempts) {
        return { success: false, error: "Unable to generate unique name. Please try a different daycare name." };
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create daycare and staff record in transaction
    await db.$transaction(async (tx) => {
      const daycare = await tx.daycare.create({
        data: {
          name: validated.name,
          slug,
          description: validated.description || null,
          email: validated.email,
          phone: validated.phone,
          address: validated.address,
          city: validated.city,
          state: validated.state,
          zipCode: validated.zipCode,
          capacity: validated.capacity,
          minAge: validated.minAge,
          maxAge: validated.maxAge,
          openingTime: validated.openingTime,
          closingTime: validated.closingTime,
          pricePerMonth: validated.pricePerMonth,
          // TODO: Implement geocoding to convert address to coordinates
          // Currently using placeholder (0,0) - daycares won't appear in location-based search
          // until coordinates are updated via geocoding service (e.g., Mapbox, Google Geocoding API)
          latitude: 0,
          longitude: 0,
          operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          status: "PENDING",
        },
      });

      await tx.providerStaff.create({
        data: {
          providerId: daycare.id,
          userId: session.user.id,
          role: "owner",
        },
      });

      // Update user role if needed
      if (session.user.role !== "DAYCARE_OWNER") {
        await tx.user.update({
          where: { id: session.user.id },
          data: { role: "DAYCARE_OWNER" },
        });
      }
    });

    revalidatePath("/portal");
    redirect("/portal/daycare");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    // Re-throw redirect
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Error creating daycare:", error);
    return { success: false, error: "Failed to create daycare" };
  }
}

export async function updateDaycareProfile(data: z.infer<typeof profileSchema>) {
  try {
    const { daycare } = await requireDaycareOwner();

    const validated = profileSchema.parse(data);

    await db.provider.update({
      where: { id: daycare.id },
      data: {
        name: validated.name,
        description: validated.description || null,
        email: validated.email,
        phone: validated.phone,
        website: validated.website || null,
        address: validated.address,
        city: validated.city,
        state: validated.state,
        zipCode: validated.zipCode,
        capacity: validated.capacity,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
      },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function addDaycarePhoto(url: string, caption?: string) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Get max order
    const maxOrderPhoto = await db.providerPhoto.findFirst({
      where: { providerId: daycare.id },
      orderBy: { order: "desc" },
    });

    const order = (maxOrderPhoto?.order ?? -1) + 1;

    // If this is the first photo, make it primary
    const isPrimary = order === 0;

    await db.providerPhoto.create({
      data: {
        providerId: daycare.id,
        url,
        caption,
        order,
        isPrimary,
      },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error adding photo:", error);
    return { success: false, error: "Failed to add photo" };
  }
}

export async function updateDaycarePhoto(
  photoId: string,
  data: { caption?: string; isPrimary?: boolean }
) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Verify photo belongs to this daycare
    const photo = await db.providerPhoto.findFirst({
      where: { id: photoId, providerId: daycare.id },
    });

    if (!photo) {
      return { success: false, error: "Photo not found" };
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await db.providerPhoto.updateMany({
        where: { providerId: daycare.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    await db.providerPhoto.update({
      where: { id: photoId },
      data: {
        caption: data.caption,
        isPrimary: data.isPrimary,
      },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error updating photo:", error);
    return { success: false, error: "Failed to update photo" };
  }
}

export async function deleteDaycarePhoto(photoId: string) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Verify photo belongs to this daycare
    const photo = await db.providerPhoto.findFirst({
      where: { id: photoId, providerId: daycare.id },
    });

    if (!photo) {
      return { success: false, error: "Photo not found" };
    }

    await db.providerPhoto.delete({
      where: { id: photoId },
    });

    // If deleted photo was primary, set first remaining as primary
    if (photo.isPrimary) {
      const firstPhoto = await db.providerPhoto.findFirst({
        where: { providerId: daycare.id },
        orderBy: { order: "asc" },
      });

      if (firstPhoto) {
        await db.providerPhoto.update({
          where: { id: firstPhoto.id },
          data: { isPrimary: true },
        });
      }
    }

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error deleting photo:", error);
    return { success: false, error: "Failed to delete photo" };
  }
}

export async function reorderDaycarePhotos(photoIds: string[]) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Update order for each photo
    await db.$transaction(
      photoIds.map((id, index) =>
        db.providerPhoto.update({
          where: { id, providerId: daycare.id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error reordering photos:", error);
    return { success: false, error: "Failed to reorder photos" };
  }
}
