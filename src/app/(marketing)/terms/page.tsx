import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | ToddlerHQ",
  description: "Read the Terms of Service for using ToddlerHQ platform.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-muted-foreground">
          Last updated: February 2, 2026
        </p>

        {/* Table of Contents */}
        <nav className="mb-12 rounded-lg border bg-muted/40 p-6">
          <h2 className="mb-4 text-lg font-semibold">Table of Contents</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li><a href="#acceptance" className="text-primary hover:underline">Acceptance of Terms</a></li>
            <li><a href="#description" className="text-primary hover:underline">Description of Service</a></li>
            <li><a href="#accounts" className="text-primary hover:underline">User Accounts</a></li>
            <li><a href="#conduct" className="text-primary hover:underline">User Conduct</a></li>
            <li><a href="#providers" className="text-primary hover:underline">Daycare Providers</a></li>
            <li><a href="#parents" className="text-primary hover:underline">Parents</a></li>
            <li><a href="#payments" className="text-primary hover:underline">Payments and Fees</a></li>
            <li><a href="#content" className="text-primary hover:underline">Content and Intellectual Property</a></li>
            <li><a href="#disclaimers" className="text-primary hover:underline">Disclaimers</a></li>
            <li><a href="#liability" className="text-primary hover:underline">Limitation of Liability</a></li>
            <li><a href="#termination" className="text-primary hover:underline">Termination</a></li>
            <li><a href="#changes" className="text-primary hover:underline">Changes to Terms</a></li>
            <li><a href="#contact" className="text-primary hover:underline">Contact</a></li>
          </ol>
        </nav>

        <div className="prose prose-gray max-w-none dark:prose-invert">
          <section id="acceptance" className="mb-8">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p className="mt-4 text-muted-foreground">
              By accessing or using ToddlerHQ (&quot;the Service&quot;), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section id="description" className="mb-8">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p className="mt-4 text-muted-foreground">
              ToddlerHQ is a platform that connects parents with daycare providers. We provide:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>A searchable directory of daycare providers</li>
              <li>Tools for booking tours and managing enrollments</li>
              <li>Messaging between parents and providers</li>
              <li>Review and rating systems</li>
              <li>Payment processing services</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              ToddlerHQ is a marketplace platform. We do not operate daycares and are not
              responsible for the services provided by daycare providers listed on our platform.
            </p>
          </section>

          <section id="accounts" className="mb-8">
            <h2 className="text-2xl font-semibold">3. User Accounts</h2>
            <p className="mt-4 text-muted-foreground">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section id="conduct" className="mb-8">
            <h2 className="text-2xl font-semibold">4. User Conduct</h2>
            <p className="mt-4 text-muted-foreground">
              You agree not to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Use the Service for any illegal purpose</li>
              <li>Post false, misleading, or defamatory content</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Interfere with the proper functioning of the Service</li>
            </ul>
          </section>

          <section id="providers" className="mb-8">
            <h2 className="text-2xl font-semibold">5. Daycare Providers</h2>
            <p className="mt-4 text-muted-foreground">
              As a daycare provider, you agree to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Provide accurate information about your facility and services</li>
              <li>Maintain all required licenses and certifications</li>
              <li>Respond to inquiries and booking requests in a timely manner</li>
              <li>Honor confirmed bookings and enrollments</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Maintain appropriate insurance coverage</li>
            </ul>
          </section>

          <section id="parents" className="mb-8">
            <h2 className="text-2xl font-semibold">6. Parents</h2>
            <p className="mt-4 text-muted-foreground">
              As a parent using our Service, you agree to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Provide accurate information about your children</li>
              <li>Conduct your own due diligence when selecting a daycare</li>
              <li>Honor confirmed bookings or cancel with reasonable notice</li>
              <li>Submit honest and fair reviews</li>
              <li>Pay for services as agreed with providers</li>
            </ul>
          </section>

          <section id="payments" className="mb-8">
            <h2 className="text-2xl font-semibold">7. Payments and Fees</h2>
            <p className="mt-4 text-muted-foreground">
              Payments processed through ToddlerHQ are subject to the following:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Payments are processed by Stripe, our third-party payment processor</li>
              <li>ToddlerHQ may charge platform fees as described in our <Link href="/pricing" className="text-primary hover:underline">pricing page</Link></li>
              <li>Refunds are subject to individual provider policies and our mediation</li>
              <li>You are responsible for any applicable taxes</li>
            </ul>
          </section>

          <section id="content" className="mb-8">
            <h2 className="text-2xl font-semibold">8. Content and Intellectual Property</h2>
            <p className="mt-4 text-muted-foreground">
              You retain ownership of content you post. By posting content, you grant ToddlerHQ
              a non-exclusive, worldwide license to use, display, and distribute your content
              in connection with the Service.
            </p>
            <p className="mt-4 text-muted-foreground">
              ToddlerHQ and its logos, features, and content are protected by intellectual
              property laws. You may not copy, modify, or distribute our content without permission.
            </p>
          </section>

          <section id="disclaimers" className="mb-8">
            <h2 className="text-2xl font-semibold">9. Disclaimers</h2>
            <p className="mt-4 text-muted-foreground">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. ToddlerHQ:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Does not guarantee the quality of daycare services</li>
              <li>Does not verify all information provided by users</li>
              <li>Is not responsible for interactions between users</li>
              <li>Does not guarantee uninterrupted or error-free service</li>
            </ul>
          </section>

          <section id="liability" className="mb-8">
            <h2 className="text-2xl font-semibold">10. Limitation of Liability</h2>
            <p className="mt-4 text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TODDLERHQ SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM
              YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section id="termination" className="mb-8">
            <h2 className="text-2xl font-semibold">11. Termination</h2>
            <p className="mt-4 text-muted-foreground">
              We may suspend or terminate your account at any time for violation of these terms
              or for any other reason at our discretion. You may delete your account at any time
              through your account settings.
            </p>
          </section>

          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-semibold">12. Changes to Terms</h2>
            <p className="mt-4 text-muted-foreground">
              We may modify these Terms at any time. We will notify users of material changes
              via email or through the Service. Continued use after changes constitutes acceptance
              of the new terms.
            </p>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-semibold">13. Contact</h2>
            <p className="mt-4 text-muted-foreground">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Email: legal@toddlerhq.com</li>
              <li>Through our <Link href="/contact" className="text-primary hover:underline">contact form</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
