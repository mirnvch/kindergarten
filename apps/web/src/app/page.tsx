import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Find the Perfect Daycare for Your Child
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            Browse thousands of licensed daycares, read reviews from real
            parents, and book tours - all in one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/search"
              className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Find Daycares
            </Link>
            <Link
              href="/register/daycare"
              className="text-lg font-semibold text-gray-900 hover:text-gray-700"
            >
              List your daycare <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
