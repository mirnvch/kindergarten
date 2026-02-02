"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { slugify } from "@/lib/utils";

export async function requireProviderOwner() {
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

/**
 * Get current user's provider for portal pages (doesn't require owner role)
 */
export async function getCurrentProvider() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const providerStaff = await db.providerStaff.findFirst({
    where: { userId: session.user.id },
    include: { provider: true },
  });

  if (!providerStaff) {
    return null;
  }

  return providerStaff.provider;
}

export async function getProvider() {
  const { provider } = await requireProviderOwner();

  const fullProvider = await db.provider.findUnique({
    where: { id: provider.id },
    include: {
      photos: { orderBy: { order: "asc" } },
      services: true,
      facilities: { include: { facility: true } },
      schedule: true,
    },
  });

  return fullProvider;
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["DOCTOR", "CLINIC", "HOSPITAL"]),
  description: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Zip code is required"),
  // Professional info
  specialty: z.string().optional(),
  subspecialty: z.string().optional(),
  credentials: z.string().optional(),
  npi: z.string().optional(),
  education: z.string().optional(),
  experience: z.number().min(0).optional(),
  languages: z.array(z.string()).optional(),
  boardCertified: z.boolean().optional(),
  // Telemedicine
  offersTelehealth: z.boolean().optional(),
  teleHealthPlatform: z.string().optional(),
  // Availability
  acceptingNewPatients: z.boolean().optional(),
  averageWaitDays: z.number().min(0).optional(),
});

const createProviderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["DOCTOR", "CLINIC", "HOSPITAL"]).default("DOCTOR"),
  description: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Zip code is required"),
  specialty: z.string().optional(),
  credentials: z.string().optional(),
  openingTime: z.string().default("09:00"),
  closingTime: z.string().default("17:00"),
  consultationFee: z.number().min(0).optional(),
});

export async function createProvider(data: z.infer<typeof createProviderSchema>) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if user already has a provider
  const existingStaff = await db.providerStaff.findFirst({
    where: { userId: session.user.id },
  });

  if (existingStaff) {
    return { success: false, error: "You already have a practice" };
  }

  try {
    const validated = createProviderSchema.parse(data);

    // Generate unique slug with safety limit
    const baseSlug = slugify(validated.name);
    let slug = baseSlug;
    let counter = 1;
    const maxAttempts = 100;

    while (await db.provider.findUnique({ where: { slug } })) {
      if (counter > maxAttempts) {
        return { success: false, error: "Unable to generate unique name. Please try a different practice name." };
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create provider and staff record in transaction
    await db.$transaction(async (tx) => {
      const provider = await tx.provider.create({
        data: {
          name: validated.name,
          slug,
          type: validated.type,
          description: validated.description || null,
          email: validated.email,
          phone: validated.phone,
          address: validated.address,
          city: validated.city,
          state: validated.state,
          zipCode: validated.zipCode,
          specialty: validated.specialty || null,
          credentials: validated.credentials || null,
          openingTime: validated.openingTime,
          closingTime: validated.closingTime,
          consultationFee: validated.consultationFee || null,
          // TODO: Implement geocoding to convert address to coordinates
          latitude: 0,
          longitude: 0,
          operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          languages: ["English"],
          acceptedInsurance: [],
          status: "PENDING",
        },
      });

      await tx.providerStaff.create({
        data: {
          providerId: provider.id,
          userId: session.user.id,
          role: "owner",
        },
      });

      // Update user role if needed
      if (session.user.role !== "PROVIDER") {
        await tx.user.update({
          where: { id: session.user.id },
          data: { role: "PROVIDER" },
        });
      }
    });

    revalidatePath("/portal");
    redirect("/portal/practice");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    // Re-throw redirect
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Error creating provider:", error);
    return { success: false, error: "Failed to create practice" };
  }
}

export async function updateProviderProfile(data: z.infer<typeof profileSchema>) {
  try {
    const { provider } = await requireProviderOwner();

    const validated = profileSchema.parse(data);

    await db.provider.update({
      where: { id: provider.id },
      data: {
        name: validated.name,
        type: validated.type,
        description: validated.description || null,
        email: validated.email,
        phone: validated.phone,
        website: validated.website || null,
        address: validated.address,
        city: validated.city,
        state: validated.state,
        zipCode: validated.zipCode,
        specialty: validated.specialty || null,
        subspecialty: validated.subspecialty || null,
        credentials: validated.credentials || null,
        npi: validated.npi || null,
        education: validated.education || null,
        experience: validated.experience || null,
        languages: validated.languages || [],
        boardCertified: validated.boardCertified || false,
        offersTelehealth: validated.offersTelehealth || false,
        teleHealthPlatform: validated.teleHealthPlatform || null,
        acceptingNewPatients: validated.acceptingNewPatients ?? true,
        averageWaitDays: validated.averageWaitDays || null,
      },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

// Insurance management
const insuranceSchema = z.object({
  acceptedInsurance: z.array(z.string()),
  acceptsMedicaid: z.boolean().optional(),
  acceptsMedicare: z.boolean().optional(),
  acceptsUninsured: z.boolean().optional(),
  slidingScalePricing: z.boolean().optional(),
});

export async function updateInsuranceInfo(data: z.infer<typeof insuranceSchema>) {
  try {
    const { provider } = await requireProviderOwner();

    const validated = insuranceSchema.parse(data);

    await db.provider.update({
      where: { id: provider.id },
      data: {
        acceptedInsurance: validated.acceptedInsurance,
        acceptsMedicaid: validated.acceptsMedicaid || false,
        acceptsMedicare: validated.acceptsMedicare || false,
        acceptsUninsured: validated.acceptsUninsured || false,
        slidingScalePricing: validated.slidingScalePricing || false,
      },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating insurance info:", error);
    return { success: false, error: "Failed to update insurance information" };
  }
}

export async function addProviderPhoto(url: string, caption?: string) {
  try {
    const { provider } = await requireProviderOwner();

    // Get max order
    const maxOrderPhoto = await db.providerPhoto.findFirst({
      where: { providerId: provider.id },
      orderBy: { order: "desc" },
    });

    const order = (maxOrderPhoto?.order ?? -1) + 1;

    // If this is the first photo, make it primary
    const isPrimary = order === 0;

    await db.providerPhoto.create({
      data: {
        providerId: provider.id,
        url,
        caption,
        order,
        isPrimary,
      },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    console.error("Error adding photo:", error);
    return { success: false, error: "Failed to add photo" };
  }
}

export async function updateProviderPhoto(
  photoId: string,
  data: { caption?: string; isPrimary?: boolean }
) {
  try {
    const { provider } = await requireProviderOwner();

    // Verify photo belongs to this provider
    const photo = await db.providerPhoto.findFirst({
      where: { id: photoId, providerId: provider.id },
    });

    if (!photo) {
      return { success: false, error: "Photo not found" };
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await db.providerPhoto.updateMany({
        where: { providerId: provider.id, isPrimary: true },
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

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    console.error("Error updating photo:", error);
    return { success: false, error: "Failed to update photo" };
  }
}

export async function deleteProviderPhoto(photoId: string) {
  try {
    const { provider } = await requireProviderOwner();

    // Verify photo belongs to this provider
    const photo = await db.providerPhoto.findFirst({
      where: { id: photoId, providerId: provider.id },
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
        where: { providerId: provider.id },
        orderBy: { order: "asc" },
      });

      if (firstPhoto) {
        await db.providerPhoto.update({
          where: { id: firstPhoto.id },
          data: { isPrimary: true },
        });
      }
    }

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    console.error("Error deleting photo:", error);
    return { success: false, error: "Failed to delete photo" };
  }
}

export async function reorderProviderPhotos(photoIds: string[]) {
  try {
    const { provider } = await requireProviderOwner();

    // Update order for each photo
    await db.$transaction(
      photoIds.map((id, index) =>
        db.providerPhoto.update({
          where: { id, providerId: provider.id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    console.error("Error reordering photos:", error);
    return { success: false, error: "Failed to reorder photos" };
  }
}
