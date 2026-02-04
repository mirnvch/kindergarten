import { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Sign In | DocConnect",
  description: "Sign in to your DocConnect account",
};

// Error messages for different error codes
const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There was a problem with the server configuration. Please try again later.",
  AccessDenied: "Access denied. You do not have permission to sign in.",
  Verification: "The verification link has expired or is invalid.",
  OAuthSignin: "Error connecting to Google. Please try again.",
  OAuthCallback: "Error during Google sign-in. Please try again.",
  OAuthCreateAccount: "Could not create account with Google. Please try again.",
  EmailCreateAccount: "Could not create account. Please try again.",
  Callback: "Authentication error. Please try again.",
  OAuthAccountNotLinked: "This email is already registered with a different sign-in method.",
  AccountDeactivated: "This account has been deactivated. Please contact support.",
  Default: "An error occurred during sign-in. Please try again.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] || ERROR_MESSAGES.Default : undefined;

  return <LoginForm error={errorMessage} callbackUrl={params.callbackUrl} />;
}
