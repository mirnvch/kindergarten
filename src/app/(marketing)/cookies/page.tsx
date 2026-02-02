import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | ToddlerHQ",
  description: "Learn about how ToddlerHQ uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold">Cookie Policy</h1>
        <p className="mb-8 text-muted-foreground">
          Last updated: January 1, 2025
        </p>

        {/* Table of Contents */}
        <nav className="mb-12 rounded-lg border bg-muted/40 p-6">
          <h2 className="mb-4 text-lg font-semibold">Table of Contents</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li><a href="#what-are-cookies" className="text-primary hover:underline">What Are Cookies</a></li>
            <li><a href="#how-we-use" className="text-primary hover:underline">How We Use Cookies</a></li>
            <li><a href="#types" className="text-primary hover:underline">Types of Cookies We Use</a></li>
            <li><a href="#third-party" className="text-primary hover:underline">Third-Party Cookies</a></li>
            <li><a href="#managing" className="text-primary hover:underline">Managing Cookies</a></li>
            <li><a href="#changes" className="text-primary hover:underline">Changes to This Policy</a></li>
            <li><a href="#contact" className="text-primary hover:underline">Contact Us</a></li>
          </ol>
        </nav>

        <div className="prose prose-gray max-w-none dark:prose-invert">
          <section id="what-are-cookies" className="mb-8">
            <h2 className="text-2xl font-semibold">1. What Are Cookies</h2>
            <p className="mt-4 text-muted-foreground">
              Cookies are small text files that are placed on your device when you visit a website.
              They are widely used to make websites work more efficiently and provide information
              to website owners.
            </p>
            <p className="mt-4 text-muted-foreground">
              We also use similar technologies such as local storage and session storage, which
              function similarly to cookies but may store larger amounts of data.
            </p>
          </section>

          <section id="how-we-use" className="mb-8">
            <h2 className="text-2xl font-semibold">2. How We Use Cookies</h2>
            <p className="mt-4 text-muted-foreground">
              We use cookies to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Keep you signed in to your account</li>
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our platform</li>
              <li>Improve our services based on usage data</li>
              <li>Provide personalized content and recommendations</li>
              <li>Ensure the security of your account</li>
            </ul>
          </section>

          <section id="types" className="mb-8">
            <h2 className="text-2xl font-semibold">3. Types of Cookies We Use</h2>

            <h3 className="mt-6 text-xl font-medium">Essential Cookies</h3>
            <p className="mt-2 text-muted-foreground">
              These cookies are necessary for the website to function properly. They enable core
              functionality such as security, authentication, and accessibility.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Cookie Name</th>
                    <th className="py-2 text-left font-medium">Purpose</th>
                    <th className="py-2 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2">authjs.session-token</td>
                    <td className="py-2">Authentication session</td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">authjs.csrf-token</td>
                    <td className="py-2">Security (CSRF protection)</td>
                    <td className="py-2">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 text-xl font-medium">Functional Cookies</h3>
            <p className="mt-2 text-muted-foreground">
              These cookies enable enhanced functionality and personalization, such as remembering
              your preferences.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Cookie Name</th>
                    <th className="py-2 text-left font-medium">Purpose</th>
                    <th className="py-2 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2">theme</td>
                    <td className="py-2">Dark/light mode preference</td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">search-preferences</td>
                    <td className="py-2">Search filter preferences</td>
                    <td className="py-2">30 days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 text-xl font-medium">Analytics Cookies</h3>
            <p className="mt-2 text-muted-foreground">
              These cookies help us understand how visitors interact with our website by collecting
              and reporting information anonymously.
            </p>
          </section>

          <section id="third-party" className="mb-8">
            <h2 className="text-2xl font-semibold">4. Third-Party Cookies</h2>
            <p className="mt-4 text-muted-foreground">
              Some cookies are placed by third-party services that appear on our pages:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li><strong>Stripe:</strong> For secure payment processing</li>
              <li><strong>Google Maps:</strong> For displaying daycare locations</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              These third parties have their own privacy and cookie policies. We encourage you
              to review their policies.
            </p>
          </section>

          <section id="managing" className="mb-8">
            <h2 className="text-2xl font-semibold">5. Managing Cookies</h2>
            <p className="mt-4 text-muted-foreground">
              You can control and manage cookies in several ways:
            </p>

            <h3 className="mt-6 text-xl font-medium">Browser Settings</h3>
            <p className="mt-2 text-muted-foreground">
              Most browsers allow you to refuse or accept cookies, delete existing cookies, and
              set preferences for certain websites. Here are links to instructions for popular browsers:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
            </ul>

            <h3 className="mt-6 text-xl font-medium">Impact of Disabling Cookies</h3>
            <p className="mt-2 text-muted-foreground">
              Please note that disabling certain cookies may affect the functionality of our website.
              Essential cookies cannot be disabled as they are necessary for the site to function.
            </p>
          </section>

          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-semibold">6. Changes to This Policy</h2>
            <p className="mt-4 text-muted-foreground">
              We may update this Cookie Policy from time to time to reflect changes in our practices
              or for legal reasons. We will post the updated policy on this page with a new
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-semibold">7. Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              If you have questions about our use of cookies, please contact us:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Email: privacy@toddlerhq.com</li>
              <li>Through our <Link href="/contact" className="text-primary hover:underline">contact form</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
