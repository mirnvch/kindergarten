import { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Sign In | KinderCare",
  description: "Sign in to your KinderCare account",
};

export default function LoginPage() {
  return <LoginForm />;
}
