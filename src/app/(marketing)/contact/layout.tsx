import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | DocConnect",
  description: "Get in touch with the DocConnect team. We're here to help with your questions.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
