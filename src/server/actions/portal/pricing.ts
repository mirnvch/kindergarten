"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

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
    throw new Error("No provider found");
  }

  return { user: session.user, provider: providerStaff.provider };
}

const pricingSchema = z.object({
  consultationFee: z.number().min(0, "Fee must be at least 0").optional().nullable(),
  telehealthFee: z.number().min(0, "Fee must be at least 0").optional().nullable(),
  acceptsUninsured: z.boolean().optional(),
  slidingScalePricing: z.boolean().optional(),
});

export type PricingInput = z.infer<typeof pricingSchema>;

export async function updatePricing(data: PricingInput) {
  try {
    const { provider } = await requireProviderOwner();

    const validated = pricingSchema.parse(data);

    await db.provider.update({
      where: { id: provider.id },
      data: {
        consultationFee: validated.consultationFee != null
          ? new Prisma.Decimal(validated.consultationFee)
          : null,
        telehealthFee: validated.telehealthFee != null
          ? new Prisma.Decimal(validated.telehealthFee)
          : null,
        acceptsUninsured: validated.acceptsUninsured,
        slidingScalePricing: validated.slidingScalePricing,
      },
    });

    revalidatePath("/portal/practice");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating pricing:", error);
    return { success: false, error: "Failed to update pricing" };
  }
}
