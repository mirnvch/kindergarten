import { Metadata } from "next";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = {
  title: "Create Account | KinderCare",
  description: "Create your KinderCare account to find or list daycare services",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
