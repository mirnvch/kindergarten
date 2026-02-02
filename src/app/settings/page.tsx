import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SettingsRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/settings");
  }

  // Redirect based on user role
  switch (session.user.role) {
    case "PARENT":
      redirect("/dashboard/settings");
    case "DAYCARE_OWNER":
    case "DAYCARE_STAFF":
      redirect("/portal/settings");
    case "ADMIN":
      redirect("/admin/settings");
    default:
      redirect("/dashboard/settings");
  }
}
