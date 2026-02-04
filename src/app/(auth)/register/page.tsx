import { Metadata } from "next";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = {
  title: "Create Account | DocConnect",
  description: "Create your DocConnect account to find healthcare providers",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
