import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            KinderCare
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} KinderCare. All rights reserved.</p>
      </footer>
    </div>
  );
}
