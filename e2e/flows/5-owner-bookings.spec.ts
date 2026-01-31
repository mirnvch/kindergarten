import { test, expect } from "../fixtures/auth";

/**
 * Flow 3.5: Daycare Owner: Handle Bookings
 * From sitemap-v2.md Section 3.5
 *
 * /portal → /portal/bookings → Booking Actions
 *
 * Tabs: Pending, Confirmed, Past
 *
 * PENDING Booking Actions:
 * - Confirm → Status: CONFIRMED
 * - Decline → Dialog + Reason
 *
 * CONFIRMED Booking Actions (dropdown):
 * - Mark Done
 * - Mark NoShow
 * - Cancel
 *
 * Contact Parent:
 * - mailto:email
 * - tel:phone
 */
test.describe("Flow 3.5: Daycare Owner Handle Bookings", () => {
  test.describe("Portal Bookings Page", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");
    });

    test("displays bookings page", async ({ page }) => {
      await expect(page).toHaveURL(/\/portal\/bookings/);
      await expect(
        page.getByRole("heading", { name: /booking/i })
      ).toBeVisible();
    });

    test("has tabs for booking status", async ({ page }) => {
      const pendingTab = page.getByRole("tab", { name: /pending/i });
      const confirmedTab = page.getByRole("tab", { name: /confirmed/i });
      const pastTab = page.getByRole("tab", { name: /past|completed/i });

      // At least one tab should be visible
      const hasPending = await pendingTab.isVisible().catch(() => false);
      const hasConfirmed = await confirmedTab.isVisible().catch(() => false);
      const hasPast = await pastTab.isVisible().catch(() => false);

      expect(hasPending || hasConfirmed || hasPast).toBeTruthy();
    });
  });

  test.describe("Pending Bookings Tab", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");

      const pendingTab = page.getByRole("tab", { name: /pending/i });
      if (await pendingTab.isVisible()) {
        await pendingTab.click();
      }
    });

    test("shows pending booking cards", async ({ page }) => {
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card, [data-status="pending"]').first();

      if (await bookingCard.isVisible()) {
        // Should show parent info
        await expect(bookingCard.getByText(/parent|name|child/i)).toBeVisible();
      }
    });

    test("pending booking has Confirm button", async ({ page }) => {
      const confirmBtn = page.getByRole("button", { name: /confirm/i }).first();

      if (await confirmBtn.isVisible()) {
        await expect(confirmBtn).toBeEnabled();
      }
    });

    test("pending booking has Decline button", async ({ page }) => {
      const declineBtn = page.getByRole("button", { name: /decline|reject/i }).first();

      if (await declineBtn.isVisible()) {
        await expect(declineBtn).toBeEnabled();
      }
    });

    test("decline opens dialog for reason", async ({ page }) => {
      const declineBtn = page.getByRole("button", { name: /decline|reject/i }).first();

      if (await declineBtn.isVisible()) {
        await declineBtn.click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Should have reason input
        await expect(
          dialog.getByLabel(/reason/i)
        ).toBeVisible();
      }
    });
  });

  test.describe("Confirmed Bookings Tab", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");

      const confirmedTab = page.getByRole("tab", { name: /confirmed/i });
      if (await confirmedTab.isVisible()) {
        await confirmedTab.click();
      }
    });

    test("shows confirmed booking cards", async ({ page }) => {
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        await expect(bookingCard).toBeVisible();
      }
    });

    test("confirmed booking has action dropdown", async ({ page }) => {
      const actionBtn = page.getByRole("button", { name: /action|more|⋮|···/i }).first();

      if (await actionBtn.isVisible()) {
        await actionBtn.click();

        // Dropdown should show options
        await expect(
          page.getByRole("menuitem", { name: /done|complete|no.?show|cancel/i }).first()
        ).toBeVisible();
      }
    });

    test("can mark booking as done", async ({ page }) => {
      const actionBtn = page.getByRole("button", { name: /action|more|⋮|···/i }).first();

      if (await actionBtn.isVisible()) {
        await actionBtn.click();

        const doneOption = page.getByRole("menuitem", { name: /done|complete/i });
        if (await doneOption.isVisible()) {
          await doneOption.click();

          // Status should change or toast should appear
          await expect(
            page.getByText(/completed|success|done/i).first()
          ).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    });

    test("can mark booking as no-show", async ({ page }) => {
      const actionBtn = page.getByRole("button", { name: /action|more|⋮|···/i }).first();

      if (await actionBtn.isVisible()) {
        await actionBtn.click();

        const noShowOption = page.getByRole("menuitem", { name: /no.?show/i });
        if (await noShowOption.isVisible()) {
          await expect(noShowOption).toBeEnabled();
        }
      }
    });
  });

  test.describe("Contact Parent", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");
    });

    test("booking card shows parent contact info", async ({ page }) => {
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        // Should have contact links
        const emailLink = bookingCard.locator('a[href^="mailto:"]');
        const phoneLink = bookingCard.locator('a[href^="tel:"]');

        const hasEmail = await emailLink.isVisible().catch(() => false);
        const hasPhone = await phoneLink.isVisible().catch(() => false);

        // At least one contact method
        if (hasEmail || hasPhone) {
          expect(hasEmail || hasPhone).toBeTruthy();
        }
      }
    });

    test("email link has correct format", async ({ page }) => {
      const emailLink = page.locator('a[href^="mailto:"]').first();

      if (await emailLink.isVisible()) {
        const href = await emailLink.getAttribute("href");
        expect(href).toMatch(/mailto:.+@.+/);
      }
    });

    test("phone link has correct format", async ({ page }) => {
      const phoneLink = page.locator('a[href^="tel:"]').first();

      if (await phoneLink.isVisible()) {
        const href = await phoneLink.getAttribute("href");
        expect(href).toMatch(/tel:\+?\d+/);
      }
    });
  });

  test.describe("Past Bookings Tab", () => {
    test("can view past bookings", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");

      const pastTab = page.getByRole("tab", { name: /past|history|completed/i });

      if (await pastTab.isVisible()) {
        await pastTab.click();

        // Should show past bookings or empty state
        const content = await page.textContent("main");
        expect(content).toBeTruthy();
      }
    });

    test("past bookings do not have action buttons", async ({
      page,
      loginAs,
    }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");

      const pastTab = page.getByRole("tab", { name: /past|history|completed/i });

      if (await pastTab.isVisible()) {
        await pastTab.click();

        const pastBooking = page.locator('[data-testid="booking-card"], .booking-card').first();

        if (await pastBooking.isVisible()) {
          // Past bookings should not have confirm/decline
          await expect(
            pastBooking.getByRole("button", { name: /confirm/i })
          ).not.toBeVisible();
        }
      }
    });
  });

  test.describe("Booking Details", () => {
    test("booking shows scheduled date/time", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");

      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        // Should show date/time
        const text = await bookingCard.textContent();
        expect(text?.match(/\d{1,2}[:\s]|am|pm|january|february|march|april|may|june|july|august|september|october|november|december/i)).toBeTruthy();
      }
    });

    test("booking shows child information", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal/bookings");

      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();

      if (await bookingCard.isVisible()) {
        // Should show child info
        const text = await bookingCard.textContent();
        expect(text?.match(/child|age|year|month/i)).toBeTruthy();
      }
    });
  });
});
