import { redirect } from "next/navigation";

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Legacy daycare booking page - redirects to provider booking page.
 * The platform has been migrated from ToddlerHQ (daycares) to DocConnect (medical providers).
 */
export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params;
  // Redirect to the new provider booking page
  redirect(`/provider/${slug}/book`);
}
