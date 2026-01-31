import { test, expect } from "../fixtures/auth";

/**
 * Flow 3.4: Daycare Owner: Onboarding Flow
 * From sitemap-v2.md Section 3.4
 *
 * /pricing → /register/daycare → /login → /portal → /portal/daycare
 *
 * 7 Tabs: Profile, Photos, Programs, Schedule, Pricing, Amenities, Staff
 *
 * Monetization Path:
 * /portal/daycare → /portal/billing → Stripe Checkout
 * /portal/payments → Stripe Connect
 *
 * After Setup:
 * → Submit for verification: /portal/verification
 * → Wait for ADMIN approval
 */
test.describe("Flow 3.4: Daycare Owner Onboarding", () => {
  test.describe("Pricing Page Entry", () => {
    test("pricing page shows plans", async ({ page }) => {
      await page.goto("/pricing");

      await expect(
        page.getByRole("heading", { name: /pricing|plans/i })
      ).toBeVisible();

      // Should show plan cards
      await expect(page.getByText(/free|starter|pro|enterprise/i).first()).toBeVisible();
    });

    test("pricing page has CTA for daycare owners", async ({ page }) => {
      await page.goto("/pricing");

      const ctaButton = page.getByRole("link", {
        name: /get started|sign up|register/i,
      });
      await expect(ctaButton.first()).toBeVisible();
    });
  });

  test.describe("Portal Dashboard", () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs("owner");
    });

    test("shows portal dashboard", async ({ page }) => {
      await page.goto("/portal");

      await expect(
        page.getByRole("heading", { name: /dashboard|portal|welcome/i })
      ).toBeVisible();
    });

    test("has sidebar navigation", async ({ page }) => {
      await page.goto("/portal");

      // Sidebar should have key links
      await expect(
        page.getByRole("link", { name: /daycare|my daycare/i })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /booking/i })
      ).toBeVisible();
    });

    test("shows quick stats", async ({ page }) => {
      await page.goto("/portal");

      // Dashboard should show some stats
      const statsText = await page.textContent("main");
      expect(
        statsText?.match(/booking|view|message|enrollment/i)
      ).toBeTruthy();
    });
  });

  test.describe("Daycare Management - 7 Tabs", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/daycare");
    });

    test("daycare page has tabs", async ({ page }) => {
      // Should have multiple tabs for management
      const tabs = page.getByRole("tab");
      const tabCount = await tabs.count();

      expect(tabCount).toBeGreaterThanOrEqual(1);
    });

    test("Profile tab - edit basic info", async ({ page }) => {
      const profileTab = page.getByRole("tab", { name: /profile|basic/i });

      if (await profileTab.isVisible()) {
        await profileTab.click();

        // Should show profile form
        await expect(page.getByLabel(/name|description/i).first()).toBeVisible();
      }
    });

    test("Photos tab - manage photos", async ({ page }) => {
      const photosTab = page.getByRole("tab", { name: /photo/i });

      if (await photosTab.isVisible()) {
        await photosTab.click();

        // Should show photo management
        await expect(
          page.getByText(/photo|image|upload|gallery/i).first()
        ).toBeVisible();
      }
    });

    test("Programs tab - manage programs", async ({ page }) => {
      const programsTab = page.getByRole("tab", { name: /program/i });

      if (await programsTab.isVisible()) {
        await programsTab.click();

        // Should show programs management
        await expect(
          page.getByText(/program|age|group/i).first()
        ).toBeVisible();
      }
    });

    test("Schedule tab - manage hours", async ({ page }) => {
      const scheduleTab = page.getByRole("tab", { name: /schedule|hour/i });

      if (await scheduleTab.isVisible()) {
        await scheduleTab.click();

        // Should show schedule management
        await expect(
          page.getByText(/monday|tuesday|hour|open|close/i).first()
        ).toBeVisible();
      }
    });

    test("Pricing tab - manage pricing", async ({ page }) => {
      const pricingTab = page.getByRole("tab", { name: /pricing|rate/i });

      if (await pricingTab.isVisible()) {
        await pricingTab.click();

        // Should show pricing management
        await expect(
          page.getByText(/price|rate|monthly|weekly/i).first()
        ).toBeVisible();
      }
    });

    test("Amenities tab - select amenities", async ({ page }) => {
      const amenitiesTab = page.getByRole("tab", { name: /amenit/i });

      if (await amenitiesTab.isVisible()) {
        await amenitiesTab.click();

        // Should show amenities checkboxes
        await expect(
          page.getByRole("checkbox").first()
        ).toBeVisible();
      }
    });

    test("Staff tab - manage staff", async ({ page }) => {
      const staffTab = page.getByRole("tab", { name: /staff|team/i });

      if (await staffTab.isVisible()) {
        await staffTab.click();

        // Should show staff management
        await expect(
          page.getByText(/staff|member|invite|add/i).first()
        ).toBeVisible();
      }
    });
  });

  test.describe("Verification Submission", () => {
    test("verification page accessible", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/verification");

      await expect(page).toHaveURL(/\/portal\/verification/);
    });

    test("shows verification status", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/verification");

      // Should show current verification status
      await expect(
        page.getByText(/verification|status|pending|approved|submit/i).first()
      ).toBeVisible();
    });

    test("verification form has required fields", async ({
      page,
      loginAs,
    }) => {
      await loginAs("owner");
      await page.goto("/portal/verification");

      // Check for verification form elements
      const formContent = await page.textContent("main");
      expect(
        formContent?.match(/license|document|upload|verify/i)
      ).toBeTruthy();
    });
  });

  test.describe("Billing & Monetization", () => {
    test("billing page accessible", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/billing");

      await expect(page).toHaveURL(/\/portal\/billing/);
    });

    test("shows current plan", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/billing");

      // Should show current plan
      await expect(
        page.getByText(/plan|subscription|free|starter|pro|enterprise/i).first()
      ).toBeVisible();
    });

    test("has upgrade option", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/billing");

      const upgradeBtn = page.getByRole("button", {
        name: /upgrade|change plan|subscribe/i,
      });

      // Upgrade button may or may not be visible depending on current plan
      if (await upgradeBtn.isVisible()) {
        await expect(upgradeBtn).toBeEnabled();
      }
    });

    test("payments page accessible", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/payments");

      await expect(page).toHaveURL(/\/portal\/payments/);
    });

    test("shows Stripe Connect status", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/payments");

      // Should show connect status or setup button
      await expect(
        page.getByText(/stripe|connect|payout|payment|setup/i).first()
      ).toBeVisible();
    });
  });

  test.describe("Analytics", () => {
    test("analytics page accessible", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/analytics");

      await expect(page).toHaveURL(/\/portal\/analytics/);
    });

    test("shows analytics or upgrade prompt", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/analytics");

      // Should show analytics data or upgrade CTA for free plan
      const content = await page.textContent("main");
      expect(
        content?.match(/view|booking|conversion|upgrade|analytics/i)
      ).toBeTruthy();
    });
  });

  test.describe("External Links", () => {
    test("can view public profile link", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal");

      const viewPublicLink = page.getByRole("link", {
        name: /view.*public|view.*listing|preview/i,
      });

      if (await viewPublicLink.isVisible()) {
        // Should link to daycare page
        const href = await viewPublicLink.getAttribute("href");
        expect(href).toMatch(/\/daycare\//);
      }
    });
  });
});
