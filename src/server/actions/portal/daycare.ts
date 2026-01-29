"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

async function requireDaycareOwner() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const daycareStaff = await db.daycareStaff.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["owner", "manager"] },
    },
    include: { daycare: true },
  });

  if (!daycareStaff) {
    throw new Error("No daycare found");
  }

  return { user: session.user, daycare: daycareStaff.daycare };
}

export async function getDaycare() {
  const { daycare } = await requireDaycareOwner();

  const fullDaycare = await db.daycare.findUnique({
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

export async function updateDaycareProfile(data: z.infer<typeof profileSchema>) {
  try {
    const { daycare } = await requireDaycareOwner();

    const validated = profileSchema.parse(data);

    await db.daycare.update({
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
    const maxOrderPhoto = await db.daycarePhoto.findFirst({
      where: { daycareId: daycare.id },
      orderBy: { order: "desc" },
    });

    const order = (maxOrderPhoto?.order ?? -1) + 1;

    // If this is the first photo, make it primary
    const isPrimary = order === 0;

    await db.daycarePhoto.create({
      data: {
        daycareId: daycare.id,
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
    const photo = await db.daycarePhoto.findFirst({
      where: { id: photoId, daycareId: daycare.id },
    });

    if (!photo) {
      return { success: false, error: "Photo not found" };
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await db.daycarePhoto.updateMany({
        where: { daycareId: daycare.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    await db.daycarePhoto.update({
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
    const photo = await db.daycarePhoto.findFirst({
      where: { id: photoId, daycareId: daycare.id },
    });

    if (!photo) {
      return { success: false, error: "Photo not found" };
    }

    await db.daycarePhoto.delete({
      where: { id: photoId },
    });

    // If deleted photo was primary, set first remaining as primary
    if (photo.isPrimary) {
      const firstPhoto = await db.daycarePhoto.findFirst({
        where: { daycareId: daycare.id },
        orderBy: { order: "asc" },
      });

      if (firstPhoto) {
        await db.daycarePhoto.update({
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
        db.daycarePhoto.update({
          where: { id, daycareId: daycare.id },
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
