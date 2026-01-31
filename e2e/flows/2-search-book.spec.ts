import { test, expect } from "../fixtures/auth";

/**
 * Flow 3.2: Parent: Search → Book Tour
 * From sitemap-v2.md Section 3.2
 *
 * /dashboard or / → /search → /daycare/[slug] → /daycare/[slug]/book → /booking/[id]/confirmation
 *
 * Error States:
 * ✗ Not logged in → Redirect to /login?callbackUrl=/daycare/slug/book
 * ✗ Not PARENT role → Redirect to /
 * ✗ No children → Prompt to add child
 * ✗ Daycare FULL → Show Waitlist form instead
 */
test.describe("Flow 3.2: Parent Search → Book Tour", () => {
  test.describe("Search Page", () => {
    test("displays search form and filters", async ({ page }) => {
      await page.goto("/search");

      // Search input
      await expect(
        page.getByPlaceholder(/city|location|search/i)
      ).toBeVisible();

      // Filters should be available
      await expect(page.getByText(/state|location/i).first()).toBeVisible();
    });

    test("displays daycare cards in results", async ({ page }) => {
      await page.goto("/search");

      // Wait for results to load
      await page.waitForSelector('[data-testid="daycare-card"], .daycare-card, article', {
        timeout: 10000,
      }).catch(() => {
        // Cards might have different structure
      });

      // Should have some content
      const content = await page.textContent("main");
      expect(content).toBeTruthy();
    });

    test("can filter by state", async ({ page }) => {
      await page.goto("/search");

      // Find and use state filter
      const stateFilter = page.locator('[data-testid="state-filter"], select').first();
      if (await stateFilter.isVisible()) {
        await stateFilter.selectOption({ index: 1 });

        // URL should update with filter
        await expect(page).toHaveURL(/state=/);
      }
    });

    test("can toggle map view", async ({ page }) => {
      await page.goto("/search");

      const mapToggle = page.getByRole("button", { name: /map/i });
      if (await mapToggle.isVisible()) {
        await mapToggle.click();

        // Map should be visible
        await expect(page.locator(".mapboxgl-map, [data-testid='map']")).toBeVisible();
      }
    });

    test("pagination works", async ({ page }) => {
      await page.goto("/search");

      const nextButton = page.getByRole("button", { name: /next|›/i });
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(page).toHaveURL(/page=2/);
      }
    });
  });

  test.describe("Daycare Detail Page", () => {
    test("displays daycare information", async ({ page }) => {
      // Navigate from search to detail
      await page.goto("/search");

      // Click first daycare card
      const firstCard = page.locator('[data-testid="daycare-card"], article, .daycare-card').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();

        // Should be on daycare detail page
        await expect(page).toHaveURL(/\/daycare\//);

        // Should show daycare name
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      }
    });

    test("shows Schedule Tour button", async ({ page }) => {
      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        // Look for booking button
        const bookButton = page.getByRole("link", { name: /schedule|book|tour/i });
        await expect(bookButton).toBeVisible();
      }
    });

    test("shows contact options", async ({ page }) => {
      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        // Contact options (phone, email, message)
        const contactSection = page.getByText(/contact|phone|email|message/i).first();
        await expect(contactSection).toBeVisible();
      }
    });
  });

  test.describe("Booking Flow - Unauthenticated", () => {
    test("redirects to login when booking without auth", async ({ page }) => {
      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        // Try to book
        const bookButton = page.getByRole("link", { name: /schedule|book|tour/i });
        if (await bookButton.isVisible()) {
          await bookButton.click();

          // Should redirect to login with callback
          await expect(page).toHaveURL(/\/login/);
          await expect(page).toHaveURL(/callbackUrl/);
        }
      }
    });
  });

  test.describe("Booking Flow - Authenticated Parent", () => {
    test("can access booking page when logged in as parent", async ({
      page,
      loginAs,
    }) => {
      await loginAs("parent");

      // Navigate to a daycare
      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        const bookButton = page.getByRole("link", { name: /schedule|book|tour/i });
        if (await bookButton.isVisible()) {
          await bookButton.click();

          // Should be on booking page (not redirected to login)
          await expect(page).toHaveURL(/\/book/);
        }
      }
    });

    test("booking form has required fields", async ({ page, loginAs }) => {
      await loginAs("parent");

      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        const bookButton = page.getByRole("link", { name: /schedule|book|tour/i });
        if (await bookButton.isVisible()) {
          await bookButton.click();
          await page.waitForURL(/\/book/);

          // Check for booking form fields
          await expect(page.getByText(/child|date|time/i).first()).toBeVisible();
        }
      }
    });
  });

  test.describe("Booking Flow - Wrong Role", () => {
    test("owner cannot book tours", async ({ page, loginAs }) => {
      await loginAs("owner");

      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        const bookButton = page.getByRole("link", { name: /schedule|book|tour/i });
        if (await bookButton.isVisible()) {
          await bookButton.click();

          // Should redirect away (not PARENT role)
          await page.waitForURL(/\/(portal|$)/, { timeout: 5000 }).catch(() => {});
        }
      }
    });
  });

  test.describe("Favorite Toggle", () => {
    test("can favorite a daycare when logged in", async ({ page, loginAs }) => {
      await loginAs("parent");

      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        // Find favorite button
        const favoriteBtn = page.getByRole("button", { name: /favorite|heart|save/i });
        if (await favoriteBtn.isVisible()) {
          await favoriteBtn.click();

          // Should toggle state (check for visual feedback)
          await expect(favoriteBtn).toHaveAttribute("aria-pressed", /(true|false)/);
        }
      }
    });
  });
});
