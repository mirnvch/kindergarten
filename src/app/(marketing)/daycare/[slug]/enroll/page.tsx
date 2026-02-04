import { redirect } from "next/navigation";

interface EnrollPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Enrollment was a daycare-specific feature.
 * For the medical platform, patients book appointments directly.
 * Redirect to the booking page.
 */
export default async function EnrollPage({ params }: EnrollPageProps) {
  const { slug } = await params;
  // Redirect to the appointment booking page
  redirect(`/provider/${slug}/book`);
}
