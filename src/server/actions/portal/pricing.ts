"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

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

const pricingSchema = z.object({
  pricePerMonth: z.number().min(0, "Price must be at least 0"),
  pricePerWeek: z.number().min(0).optional().nullable(),
  pricePerDay: z.number().min(0).optional().nullable(),
  registrationFee: z.number().min(0).optional().nullable(),
});

export type PricingInput = z.infer<typeof pricingSchema>;

export async function updatePricing(data: PricingInput) {
  try {
    const { daycare } = await requireDaycareOwner();

    const validated = pricingSchema.parse(data);

    await db.daycare.update({
      where: { id: daycare.id },
      data: {
        pricePerMonth: new Prisma.Decimal(validated.pricePerMonth),
        pricePerWeek: validated.pricePerWeek
          ? new Prisma.Decimal(validated.pricePerWeek)
          : null,
        pricePerDay: validated.pricePerDay
          ? new Prisma.Decimal(validated.pricePerDay)
          : null,
        registrationFee: validated.registrationFee
          ? new Prisma.Decimal(validated.registrationFee)
          : null,
      },
    });

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating pricing:", error);
    return { success: false, error: "Failed to update pricing" };
  }
}
