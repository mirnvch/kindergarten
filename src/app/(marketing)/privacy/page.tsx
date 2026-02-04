import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | DocConnect",
  description: "Learn how DocConnect collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold">Privacy Policy</h1>
        <p className="mb-8 text-muted-foreground">
          Last updated: February 2, 2026
        </p>

        {/* Table of Contents */}
        <nav className="mb-12 rounded-lg border bg-muted/40 p-6">
          <h2 className="mb-4 text-lg font-semibold">Table of Contents</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li><a href="#information-we-collect" className="text-primary hover:underline">Information We Collect</a></li>
            <li><a href="#how-we-use" className="text-primary hover:underline">How We Use Your Information</a></li>
            <li><a href="#information-sharing" className="text-primary hover:underline">Information Sharing</a></li>
            <li><a href="#data-security" className="text-primary hover:underline">Data Security</a></li>
            <li><a href="#your-rights" className="text-primary hover:underline">Your Rights</a></li>
            <li><a href="#cookies" className="text-primary hover:underline">Cookies</a></li>
            <li><a href="#children" className="text-primary hover:underline">Children&apos;s Privacy</a></li>
            <li><a href="#changes" className="text-primary hover:underline">Changes to This Policy</a></li>
            <li><a href="#contact" className="text-primary hover:underline">Contact Us</a></li>
          </ol>
        </nav>

        <div className="prose prose-gray max-w-none dark:prose-invert">
          <section id="information-we-collect" className="mb-8">
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p className="mt-4 text-muted-foreground">
              We collect information you provide directly to us, including:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Account information (name, email, phone number)</li>
              <li>Profile information for patients (health preferences, insurance)</li>
              <li>Profile information for healthcare providers (practice details, credentials, photos)</li>
              <li>Communications and messages sent through our platform</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Reviews and ratings you submit</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              We also automatically collect certain information when you use our services:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Device information and browser type</li>
              <li>IP address and general location</li>
              <li>Usage data and interactions with our platform</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section id="how-we-use" className="mb-8">
            <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
            <p className="mt-4 text-muted-foreground">
              We use the information we collect to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Provide and maintain our services</li>
              <li>Connect patients with healthcare providers</li>
              <li>Process appointments and payments</li>
              <li>Send notifications about appointments and messages</li>
              <li>Improve and personalize our services</li>
              <li>Ensure safety and security of our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section id="information-sharing" className="mb-8">
            <h2 className="text-2xl font-semibold">3. Information Sharing</h2>
            <p className="mt-4 text-muted-foreground">
              We may share your information in the following circumstances:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li><strong>With healthcare providers or patients:</strong> To facilitate connections and appointments</li>
              <li><strong>With service providers:</strong> Who assist us in operating our platform (e.g., payment processors, hosting providers)</li>
              <li><strong>For legal reasons:</strong> When required by law or to protect our rights</li>
              <li><strong>With your consent:</strong> When you explicitly agree to share information</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section id="data-security" className="mb-8">
            <h2 className="text-2xl font-semibold">4. Data Security</h2>
            <p className="mt-4 text-muted-foreground">
              We implement appropriate security measures to protect your information, including:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure payment processing through Stripe</li>
            </ul>
          </section>

          <section id="your-rights" className="mb-8">
            <h2 className="text-2xl font-semibold">5. Your Rights</h2>
            <p className="mt-4 text-muted-foreground">
              Depending on your location, you may have the right to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Port your data to another service</li>
              <li>Withdraw consent where applicable</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              To exercise these rights, please contact us at privacy@docconnect.com.
            </p>
          </section>

          <section id="cookies" className="mb-8">
            <h2 className="text-2xl font-semibold">6. Cookies</h2>
            <p className="mt-4 text-muted-foreground">
              We use cookies and similar technologies to provide and improve our services.
              For more information, please see our{" "}
              <Link href="/cookies" className="text-primary hover:underline">
                Cookie Policy
              </Link>.
            </p>
          </section>

          <section id="children" className="mb-8">
            <h2 className="text-2xl font-semibold">7. Children&apos;s Privacy</h2>
            <p className="mt-4 text-muted-foreground">
              Our services are not directed to children under 13. We do not knowingly collect
              personal information from children under 13. This information is protected with
              the same care as all user data.
            </p>
          </section>

          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-semibold">8. Changes to This Policy</h2>
            <p className="mt-4 text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the &quot;Last updated&quot;
              date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-semibold">9. Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Email: privacy@docconnect.com</li>
              <li>Through our <Link href="/contact" className="text-primary hover:underline">contact form</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
