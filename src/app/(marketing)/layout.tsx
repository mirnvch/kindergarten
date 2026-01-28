import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const user = session?.user
    ? {
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        avatarUrl: session.user.image,
        role: session.user.role,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
