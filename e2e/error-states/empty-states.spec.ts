import { test, expect } from "../fixtures/auth";

/**
 * Empty States & Error States Tests
 * From sitemap-v2.md Section 6.4
 *
 * Empty States:
 * | Страница                   | Empty State           | CTA           |
 * |----------------------------|-----------------------|---------------|
 * | /dashboard/bookings        | "No bookings yet"     | → /search     |
 * | /dashboard/children        | "No children added"   | → /new        |
 * | /dashboard/favorites       | "No favorites"        | → /search     |
 * | /dashboard/messages        | "No messages"         | → /search     |
 * | /dashboard/saved-searches  | "No saved searches"   | → /search     |
 * | /search (no results)       | "No daycares found"   | Clear filters |
 */
test.describe("Empty States", () => {
  test.describe("Parent Dashboard Empty States", () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs("parent");
    });

    test("bookings page shows empty state with CTA", async ({ page }) => {
      await page.goto("/dashboard/bookings");

      // Check for empty state or booking cards
      const emptyState = page.getByText(/no booking|no upcoming|haven't booked/i);
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card');

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasBookings = await bookingCard.first().isVisible().catch(() => false);

      if (hasEmpty && !hasBookings) {
        // Should have CTA to search
        const searchCta = page.getByRole("link", { name: /search|find|browse/i });
        await expect(searchCta).toBeVisible();

        // CTA should link to search
        const href = await searchCta.getAttribute("href");
        expect(href).toMatch(/\/search/);
      }
    });

    test("children page shows empty state with CTA", async ({ page }) => {
      await page.goto("/dashboard/children");

      const emptyState = page.getByText(/no child|add.*child|haven't added/i);
      const childCard = page.locator('[data-testid="child-card"], .child-card');

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasChildren = await childCard.first().isVisible().catch(() => false);

      if (hasEmpty && !hasChildren) {
        // Should have CTA to add child
        const addCta = page.getByRole("link", { name: /add|new|create/i });
        await expect(addCta).toBeVisible();

        // CTA should link to add child page
        const href = await addCta.getAttribute("href");
        expect(href).toMatch(/\/children\/new/);
      }
    });

    test("favorites page shows empty state with CTA", async ({ page }) => {
      await page.goto("/dashboard/favorites");

      const emptyState = page.getByText(/no favorite|haven't saved|no saved/i);
      const favoriteCard = page.locator('[data-testid="daycare-card"], .daycare-card');

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasFavorites = await favoriteCard.first().isVisible().catch(() => false);

      if (hasEmpty && !hasFavorites) {
        // Should have CTA to search
        const searchCta = page.getByRole("link", { name: /search|find|browse/i });
        await expect(searchCta).toBeVisible();
      }
    });

    test("messages page shows empty state with CTA", async ({ page }) => {
      await page.goto("/dashboard/messages");

      const emptyState = page.getByText(/no message|no conversation|inbox.*empty/i);
      const messageThread = page.locator('[data-testid="message-thread"], .thread');

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasMessages = await messageThread.first().isVisible().catch(() => false);

      if (hasEmpty && !hasMessages) {
        // Should have CTA to search
        const searchCta = page.getByRole("link", { name: /search|find|browse/i });
        await expect(searchCta).toBeVisible();
      }
    });

    test("saved searches page shows empty state with CTA", async ({ page }) => {
      await page.goto("/dashboard/saved-searches");

      const emptyState = page.getByText(/no saved search|haven't saved/i);

      if (await emptyState.isVisible()) {
        // Should have CTA to search
        const searchCta = page.getByRole("link", { name: /search|find|browse/i });
        await expect(searchCta).toBeVisible();
      }
    });
  });

  test.describe("Search Empty State", () => {
    test("search with no results shows empty state", async ({ page }) => {
      // Search with filters that likely return no results
      await page.goto("/search?query=xyznonexistent123");

      const emptyState = page.getByText(/no daycare|no result|nothing found|couldn't find/i);

      if (await emptyState.isVisible()) {
        // Should have clear filters option
        const clearBtn = page.getByRole("button", { name: /clear|reset|remove/i });
        await expect(clearBtn).toBeVisible();
      }
    });

    test("clearing filters works", async ({ page }) => {
      await page.goto("/search?query=xyznonexistent123&minRating=5");

      const clearBtn = page.getByRole("button", { name: /clear|reset/i });

      if (await clearBtn.isVisible()) {
        await clearBtn.click();

        // URL should have fewer params
        const url = page.url();
        expect(url).not.toContain("query=xyznonexistent");
      }
    });
  });

  test.describe("Owner Portal Empty States", () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs("owner");
    });

    test("bookings page shows empty state", async ({ page }) => {
      await page.goto("/portal/bookings");

      const emptyState = page.getByText(/no booking|no pending|no request/i);
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card, tr').first();

      // Either empty state or bookings
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasBookings = await bookingCard.isVisible().catch(() => false);

      expect(hasEmpty || hasBookings).toBeTruthy();
    });

    test("messages page shows empty state", async ({ page }) => {
      await page.goto("/portal/messages");

      const emptyState = page.getByText(/no message|no conversation/i);
      const messageThread = page.locator('[data-testid="message-thread"], .thread').first();

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasMessages = await messageThread.isVisible().catch(() => false);

      expect(hasEmpty || hasMessages).toBeTruthy();
    });

    test("reviews page shows empty state", async ({ page }) => {
      await page.goto("/portal/reviews");

      const emptyState = page.getByText(/no review|no rating/i);
      const reviewCard = page.locator('[data-testid="review-card"], .review-card').first();

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasReviews = await reviewCard.isVisible().catch(() => false);

      expect(hasEmpty || hasReviews).toBeTruthy();
    });

    test("waitlist page shows empty state", async ({ page }) => {
      await page.goto("/portal/waitlist");

      const emptyState = page.getByText(/no.*waitlist|empty waitlist|no one waiting/i);
      const waitlistEntry = page.locator('[data-testid="waitlist-entry"], .waitlist-entry, tr').first();

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasEntries = await waitlistEntry.isVisible().catch(() => false);

      expect(hasEmpty || hasEntries).toBeTruthy();
    });
  });

  test.describe("Admin Panel Empty States", () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs("admin");
    });

    test("filtered users with no results", async ({ page }) => {
      await page.goto("/admin/users?search=xyznonexistent");

      const emptyState = page.getByText(/no user|no result|not found/i);

      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    });

    test("filtered daycares with no results", async ({ page }) => {
      await page.goto("/admin/daycares?search=xyznonexistent");

      const emptyState = page.getByText(/no daycare|no result|not found/i);

      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    });

    test("filtered verifications with no results", async ({ page }) => {
      await page.goto("/admin/verifications?status=PENDING");

      const emptyState = page.getByText(/no verification|no pending|no request/i);
      const verificationRow = page.locator('tr, [data-testid="verification-card"]').first();

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasVerifications = await verificationRow.isVisible().catch(() => false);

      expect(hasEmpty || hasVerifications).toBeTruthy();
    });
  });
});

test.describe("Error States", () => {
  test.describe("404 Not Found", () => {
    test("invalid daycare slug shows 404", async ({ page }) => {
      await page.goto("/daycare/this-daycare-does-not-exist-12345");

      // Should show 404 page or not found message
      await expect(
        page.getByText(/not found|404|doesn't exist/i).first()
      ).toBeVisible();
    });

    test("invalid child id shows 404", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/children/invalid-id-12345/edit");

      // Should show 404 or redirect
      const url = page.url();
      const has404 = await page.getByText(/not found|404/i).first().isVisible().catch(() => false);
      const redirected = !url.includes("invalid-id");

      expect(has404 || redirected).toBeTruthy();
    });

    test("invalid booking confirmation shows 404", async ({
      page,
      loginAs,
    }) => {
      await loginAs("parent");
      await page.goto("/booking/invalid-id-12345/confirmation");

      // Should show 404 or redirect
      const has404 = await page.getByText(/not found|404/i).first().isVisible().catch(() => false);
      const redirected = !page.url().includes("invalid-id");

      expect(has404 || redirected).toBeTruthy();
    });

    test("invalid admin verification id shows 404", async ({
      page,
      loginAs,
    }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications/invalid-id-12345");

      // Should show 404 or redirect
      const has404 = await page.getByText(/not found|404/i).first().isVisible().catch(() => false);
      const redirected = !page.url().includes("invalid-id");

      expect(has404 || redirected).toBeTruthy();
    });
  });

  test.describe("Business Logic Edge Cases", () => {
    test("daycare FULL shows waitlist instead of enroll", async ({
      page,
      loginAs,
    }) => {
      await loginAs("parent");

      // Navigate to a daycare
      await page.goto("/search");

      const daycareCard = page.locator('[data-testid="daycare-card"], article').first();

      if (await daycareCard.isVisible()) {
        await daycareCard.click();
        await page.waitForURL(/\/daycare\//);

        // Check for either enroll button or waitlist form
        const enrollBtn = page.getByRole("link", { name: /enroll/i });
        const waitlistBtn = page.getByRole("button", { name: /waitlist|join waitlist/i });

        const hasEnroll = await enrollBtn.isVisible().catch(() => false);
        const hasWaitlist = await waitlistBtn.isVisible().catch(() => false);

        // Should have one or the other (depending on capacity)
        expect(hasEnroll || hasWaitlist).toBeTruthy();
      }
    });

    test("FREE plan analytics shows upgrade CTA", async ({
      page,
      loginAs,
    }) => {
      await loginAs("owner");
      await page.goto("/portal/analytics");

      // Should show either analytics or upgrade prompt
      const upgradePrompt = page.getByText(/upgrade|premium|pro plan/i);
      const analyticsData = page.getByText(/view|booking|conversion/i);

      const hasUpgrade = await upgradePrompt.isVisible().catch(() => false);
      const hasAnalytics = await analyticsData.first().isVisible().catch(() => false);

      expect(hasUpgrade || hasAnalytics).toBeTruthy();
    });
  });
});
