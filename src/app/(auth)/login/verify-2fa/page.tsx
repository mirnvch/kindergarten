import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TwoFactorVerifyForm } from "./two-factor-verify-form";

export const metadata: Metadata = {
  title: "Verify Two-Factor Authentication | KinderCare",
  description: "Enter your two-factor authentication code",
};

interface Verify2FAPageProps {
  searchParams: Promise<{ userId?: string; callbackUrl?: string; oauth?: string }>;
}

export default async function Verify2FAPage({ searchParams }: Verify2FAPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();

  // For OAuth flow, get userId from cookie
  let userId = params.userId;
  const callbackUrl = params.callbackUrl || "/dashboard";

  if (params.oauth === "true") {
    const oauthCookie = cookieStore.get("oauth_2fa_pending");
    if (oauthCookie?.value) {
      userId = oauthCookie.value;
    }
  }

  // userId should be passed from the login flow or OAuth cookie
  if (!userId) {
    redirect("/login");
  }

  return (
    <TwoFactorVerifyForm
      userId={userId}
      callbackUrl={callbackUrl}
    />
  );
}
