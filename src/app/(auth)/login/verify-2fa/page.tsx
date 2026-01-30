import { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoFactorVerifyForm } from "./two-factor-verify-form";

export const metadata: Metadata = {
  title: "Verify Two-Factor Authentication | KinderCare",
  description: "Enter your two-factor authentication code",
};

interface Verify2FAPageProps {
  searchParams: Promise<{ userId?: string; callbackUrl?: string }>;
}

export default async function Verify2FAPage({ searchParams }: Verify2FAPageProps) {
  const params = await searchParams;

  // userId should be passed from the login flow
  if (!params.userId) {
    redirect("/login");
  }

  return (
    <TwoFactorVerifyForm
      userId={params.userId}
      callbackUrl={params.callbackUrl || "/dashboard"}
    />
  );
}
