import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Register Your Daycare | KinderCare",
  description: "List your daycare on KinderCare and reach more families",
};

export default function RegisterDaycarePage() {
  // Redirect to main register page - the role can be selected there
  // In the future, this could be a dedicated daycare registration flow
  redirect("/register");
}
