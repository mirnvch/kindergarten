import { db } from "@/lib/db";
import { SettingsForm } from "@/components/admin/settings-form";
import { DEFAULT_SETTINGS } from "@/server/actions/admin/settings";

async function getSettings() {
  const settings = await db.platformSettings.findMany();

  // Convert array to object
  const settingsMap = settings.reduce(
    (acc, s) => ({ ...acc, [s.key]: s.value }),
    {} as Record<string, unknown>
  );

  return settingsMap;
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure platform settings and feature flags
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
