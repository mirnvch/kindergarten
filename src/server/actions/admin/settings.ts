"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getSetting(key: string) {
  const setting = await db.platformSettings.findUnique({
    where: { key },
  });
  return setting?.value ?? null;
}

export async function getSettings() {
  const settings = await db.platformSettings.findMany();
  return settings.reduce(
    (acc, s) => ({ ...acc, [s.key]: s.value }),
    {} as Record<string, unknown>
  );
}

export async function updateSetting(key: string, value: unknown, description?: string) {
  try {
    const admin = await requireAdmin();

    await db.platformSettings.upsert({
      where: { key },
      update: { value: value as object, description },
      create: { key, value: value as object, description },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "SETTING_UPDATED",
        entityType: "PlatformSettings",
        entityId: key,
        newData: { key, value: JSON.stringify(value) },
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating setting:", error);
    return { success: false, error: "Failed to update setting" };
  }
}

export async function updateSettings(settings: Record<string, unknown>) {
  try {
    const admin = await requireAdmin();

    const updates = Object.entries(settings).map(([key, value]) =>
      db.platformSettings.upsert({
        where: { key },
        update: { value: value as object },
        create: { key, value: value as object },
      })
    );

    await db.$transaction(updates);

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "SETTINGS_BULK_UPDATE",
        entityType: "PlatformSettings",
        entityId: "bulk",
        newData: settings as object,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function deleteSetting(key: string) {
  try {
    const admin = await requireAdmin();

    await db.platformSettings.delete({
      where: { key },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "SETTING_DELETED",
        entityType: "PlatformSettings",
        entityId: key,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error deleting setting:", error);
    return { success: false, error: "Failed to delete setting" };
  }
}

// Default settings structure
export const DEFAULT_SETTINGS = {
  site: {
    name: "DocConnect",
    tagline: "Find the perfect healthcare provider",
    contactEmail: "support@docconnect.com",
    supportPhone: "",
  },
  features: {
    enableRegistration: true,
    enableDaycareSignup: true,
    enableReviews: true,
    enableMessaging: true,
    enableWaitlist: true,
    maintenanceMode: false,
  },
  pricing: {
    platformFeePercent: 5,
    minBookingNoticeHours: 24,
    maxBookingAdvanceDays: 30,
  },
  moderation: {
    autoApproveReviews: false,
    autoApproveDaycares: false,
    requireEmailVerification: true,
  },
};
