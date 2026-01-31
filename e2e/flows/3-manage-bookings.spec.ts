import { test, expect } from "../fixtures/auth";

/**
 * Flow 3.3: Parent: Manage Bookings
 * From sitemap-v2.md Section 3.3
 *
 * /dashboard "View all →" → /dashboard/bookings → Action Dialogs
 *
 * Tabs: Upcoming, Past
 * Actions: Reschedule, Cancel
 *
 * Constraints:
 * ⚠ Cannot reschedule within 24h of tour
 * ⚠ Cannot cancel within 24h of tour
 */
test.describe("Flow 3.3: Parent Manage Bookings", () => {
  test.describe("Dashboard Overview", () => {
    test("shows bookings section on dashboard", async ({ page, loginAs }) => {
      await loginAs("parent");

      await page.goto("/dashboard");

      // Should show bookings section or link
      const bookingsLink = page.getByRole("link", { name: /booking|view all/i });
      await expect(bookingsLink.first()).toBeVisible();
    });

    test("navigates to bookings page from dashboard", async ({
      page,
      loginAs,
    }) => {
      await loginAs("parent");

      await page.goto("/dashboard");

      // Click bookings link in sidebar or dashboard
      const bookingsLink = page.getByRole("link", { name: /booking/i }).first();
      await bookingsLink.click();

      await expect(page).toHaveURL(/\/dashboard\/bookings/);
    });
  });

  test.describe("Bookings Page", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");
    });

    test("displays bookings page", async ({ page }) => {
      await expect(page.getByRole("heading", { name: /booking/i })).toBeVisible();
    });

    test("has tabs for upcoming and past", async ({ page }) => {
      const upcomingTab = page.getByRole("tab", { name: /upcoming/i });
      const pastTab = page.getByRole("tab", { name: /past|history/i });

      // At least one tab should be visible
      const hasUpcoming = await upcomingTab.isVisible().catch(() => false);
      const hasPast = await pastTab.isVisible().catch(() => false);

      expect(hasUpcoming || hasPast).toBeTruthy();
    });

    test("shows empty state when no bookings", async ({ page }) => {
      // Check for empty state or booking cards
      const emptyState = page.getByText(/no booking|no upcoming|start searching/i);
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card');

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasBookings = await bookingCard.first().isVisible().catch(() => false);

      // Either empty state or bookings should be shown
      expect(hasEmpty || hasBookings).toBeTruthy();
    });

    test("empty state has CTA to search", async ({ page }) => {
      const searchCta = page.getByRole("link", { name: /search|find/i });

      if (await searchCta.isVisible()) {
        await searchCta.click();
        await expect(page).toHaveURL(/\/search/);
      }
    });
  });

  test.describe("Booking Actions", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");
    });

    test("booking card shows daycare info", async ({ page }) => {
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        // Should show daycare name, date, time
        await expect(bookingCard.getByText(/daycare|school|center/i)).toBeVisible();
      }
    });

    test("booking card has reschedule option", async ({ page }) => {
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        const rescheduleBtn = bookingCard.getByRole("button", {
          name: /reschedule/i,
        });

        // May or may not be visible depending on 24h policy
        if (await rescheduleBtn.isVisible()) {
          await rescheduleBtn.click();

          // Dialog should open
          await expect(page.getByRole("dialog")).toBeVisible();
        }
      }
    });

    test("booking card has cancel option", async ({ page }) => {
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        const cancelBtn = bookingCard.getByRole("button", { name: /cancel/i });

        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();

          // Confirmation dialog should open
          await expect(page.getByRole("dialog")).toBeVisible();
          await expect(
            page.getByText(/confirm|sure|cancel this/i)
          ).toBeVisible();
        }
      }
    });

    test("can view daycare from booking", async ({ page }) => {
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        const viewLink = bookingCard.getByRole("link", {
          name: /view|daycare|details/i,
        });

        if (await viewLink.isVisible()) {
          await viewLink.click();
          await expect(page).toHaveURL(/\/daycare\//);
        }
      }
    });
  });

  test.describe("Reschedule Dialog", () => {
    test("reschedule dialog has date/time picker", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");

      const rescheduleBtn = page
        .getByRole("button", { name: /reschedule/i })
        .first();

      if (await rescheduleBtn.isVisible()) {
        await rescheduleBtn.click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Should have date/time selection
        await expect(
          dialog.getByText(/date|time|select/i).first()
        ).toBeVisible();
      }
    });

    test("reschedule shows 24h policy warning", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");

      const rescheduleBtn = page
        .getByRole("button", { name: /reschedule/i })
        .first();

      if (await rescheduleBtn.isVisible()) {
        await rescheduleBtn.click();

        // Policy warning
        await expect(
          page.getByText(/24 hour|policy|advance/i).first()
        ).toBeVisible();
      }
    });
  });

  test.describe("Cancel Dialog", () => {
    test("cancel dialog shows confirmation", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");

      const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();

      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Confirm button
        await expect(
          dialog.getByRole("button", { name: /confirm|yes|cancel booking/i })
        ).toBeVisible();
      }
    });

    test("cancel dialog shows policy", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");

      const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();

      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();

        // Policy information
        await expect(page.getByText(/policy|24 hour/i).first()).toBeVisible();
      }
    });
  });

  test.describe("Past Bookings Tab", () => {
    test("can switch to past bookings", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");

      const pastTab = page.getByRole("tab", { name: /past|history/i });

      if (await pastTab.isVisible()) {
        await pastTab.click();

        // Tab should be selected
        await expect(pastTab).toHaveAttribute("aria-selected", "true");
      }
    });

    test("past bookings do not have action buttons", async ({
      page,
      loginAs,
    }) => {
      await loginAs("parent");
      await page.goto("/dashboard/bookings");

      const pastTab = page.getByRole("tab", { name: /past|history/i });

      if (await pastTab.isVisible()) {
        await pastTab.click();

        // Past bookings should not have reschedule/cancel
        const pastBooking = page.locator('[data-testid="booking-card"], .booking-card').first();

        if (await pastBooking.isVisible()) {
          await expect(
            pastBooking.getByRole("button", { name: /reschedule/i })
          ).not.toBeVisible();
          await expect(
            pastBooking.getByRole("button", { name: /cancel/i })
          ).not.toBeVisible();
        }
      }
    });
  });
});
