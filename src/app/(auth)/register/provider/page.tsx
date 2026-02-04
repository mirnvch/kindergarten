import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Register Your Practice | DocConnect",
  description: "List your practice on DocConnect and reach more patients",
};

export default function RegisterProviderPage() {
  // Redirect to main register page - the role can be selected there
  // In the future, this could be a dedicated provider registration flow
  redirect("/register");
}
