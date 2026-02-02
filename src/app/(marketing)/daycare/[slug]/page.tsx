import { redirect } from "next/navigation";

interface DaycarePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Legacy daycare detail page - redirects to provider page.
 * The platform has been migrated from ToddlerHQ (daycares) to DocConnect (medical providers).
 */
export default async function DaycarePage({ params }: DaycarePageProps) {
  const { slug } = await params;
  // Redirect to the new provider page
  redirect(`/provider/${slug}`);
}
