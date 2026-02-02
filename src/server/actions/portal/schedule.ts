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

export interface ScheduleDay {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export async function getSchedule() {
  const { daycare } = await requireDaycareOwner();

  return db.daycareSchedule.findMany({
    where: { providerId: daycare.id },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function updateSchedule(schedules: ScheduleDay[]) {
  try {
    const { daycare } = await requireDaycareOwner();

    // Use upsert for each day
    const updates = schedules.map((s) =>
      db.daycareSchedule.upsert({
        where: {
          providerId_dayOfWeek: {
            providerId: daycare.id,
            dayOfWeek: s.dayOfWeek,
          },
        },
        update: {
          openTime: s.openTime,
          closeTime: s.closeTime,
          isClosed: s.isClosed,
        },
        create: {
          providerId: daycare.id,
          dayOfWeek: s.dayOfWeek,
          openTime: s.openTime,
          closeTime: s.closeTime,
          isClosed: s.isClosed,
        },
      })
    );

    await db.$transaction(updates);

    revalidatePath("/portal/daycare");
    return { success: true };
  } catch (error) {
    console.error("Error updating schedule:", error);
    return { success: false, error: "Failed to update schedule" };
  }
}
