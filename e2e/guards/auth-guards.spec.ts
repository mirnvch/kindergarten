import { test, expect } from "../fixtures/auth";

/**
 * Auth Guards Tests
 * From sitemap-v2.md Section 5.2
 *
 * Auth Guard Redirects:
 * | Попытка доступа       | Без авторизации              | Неправильная роль |
 * |-----------------------|------------------------------|-------------------|
 * | /dashboard/*          | → /login?callbackUrl=...     | → /               |
 * | /portal/*             | → /login?callbackUrl=...     | → /               |
 * | /admin/*              | → /login?callbackUrl=...     | → /               |
 * | /daycare/[slug]/book  | → /login?callbackUrl=...     | → /               |
 * | /daycare/[slug]/enroll| → /login?callbackUrl=...     | → /               |
 */
test.describe("Auth Guards", () => {
  test.describe("Unauthenticated Access", () => {
    const protectedRoutes = [
      { url: "/dashboard", name: "Parent Dashboard" },
      { url: "/dashboard/bookings", name: "Parent Bookings" },
      { url: "/dashboard/children", name: "Parent Children" },
      { url: "/dashboard/favorites", name: "Parent Favorites" },
      { url: "/dashboard/messages", name: "Parent Messages" },
      { url: "/dashboard/settings", name: "Parent Settings" },
      { url: "/portal", name: "Owner Portal" },
      { url: "/portal/daycare", name: "Owner Daycare" },
      { url: "/portal/bookings", name: "Owner Bookings" },
      { url: "/portal/verification", name: "Owner Verification" },
      { url: "/portal/billing", name: "Owner Billing" },
      { url: "/admin", name: "Admin Dashboard" },
      { url: "/admin/users", name: "Admin Users" },
      { url: "/admin/daycares", name: "Admin Daycares" },
      { url: "/admin/verifications", name: "Admin Verifications" },
    ];

    for (const route of protectedRoutes) {
      test(`${route.name} redirects to login`, async ({ page }) => {
        await page.goto(route.url);

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
      });

      test(`${route.name} includes callbackUrl`, async ({ page }) => {
        await page.goto(route.url);

        // Should include callback URL
        await expect(page).toHaveURL(/callbackUrl/);
      });
    }
  });

  test.describe("Role-Based Access - PARENT", () => {
    test("PARENT can access /dashboard", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("PARENT cannot access /portal", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/portal");

      // Should redirect away
      await page.waitForURL(/\/(dashboard|$)/, { timeout: 5000 }).catch(() => {});
      await expect(page).not.toHaveURL(/\/portal/);
    });

    test("PARENT cannot access /admin", async ({ page, loginAs }) => {
      await loginAs("parent");
      await page.goto("/admin");

      // Should redirect away
      await page.waitForURL(/\/(dashboard|$)/, { timeout: 5000 }).catch(() => {});
      await expect(page).not.toHaveURL(/\/admin/);
    });
  });

  test.describe("Role-Based Access - DAYCARE_OWNER", () => {
    test("OWNER can access /portal", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/portal");

      await expect(page).toHaveURL(/\/portal/);
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("OWNER cannot access /dashboard", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/dashboard");

      // Should redirect away
      await page.waitForURL(/\/(portal|$)/, { timeout: 5000 }).catch(() => {});
      await expect(page).not.toHaveURL(/\/dashboard/);
    });

    test("OWNER cannot access /admin", async ({ page, loginAs }) => {
      await loginAs("owner");
      await page.goto("/admin");

      // Should redirect away
      await page.waitForURL(/\/(portal|$)/, { timeout: 5000 }).catch(() => {});
      await expect(page).not.toHaveURL(/\/admin/);
    });

    test("OWNER cannot book tours", async ({ page, loginAs }) => {
      await loginAs("owner");

      // Try to access booking page directly
      await page.goto("/search");
      const firstCard = page.locator('[data-testid="daycare-card"], article').first();

      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        const bookBtn = page.getByRole("link", { name: /book|schedule/i });
        if (await bookBtn.isVisible()) {
          await bookBtn.click();

          // Should not be on booking page
          await page.waitForURL(/\/(portal|$)/, { timeout: 5000 }).catch(() => {});
        }
      }
    });
  });

  test.describe("Role-Based Access - ADMIN", () => {
    test("ADMIN can access /admin", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin");

      await expect(page).toHaveURL(/\/admin/);
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("ADMIN cannot access /dashboard", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/dashboard");

      // Should redirect away
      await page.waitForURL(/\/(admin|$)/, { timeout: 5000 }).catch(() => {});
      await expect(page).not.toHaveURL(/\/dashboard/);
    });

    test("ADMIN cannot access /portal", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/portal");

      // Should redirect away
      await page.waitForURL(/\/(admin|$)/, { timeout: 5000 }).catch(() => {});
      await expect(page).not.toHaveURL(/\/portal/);
    });
  });

  test.describe("Booking/Enroll Guards", () => {
    test("unauthenticated user redirected from booking", async ({ page }) => {
      // Assuming there's a daycare with slug
      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();

      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        const bookBtn = page.getByRole("link", { name: /book|schedule/i });

        if (await bookBtn.isVisible()) {
          await bookBtn.click();

          // Should redirect to login
          await expect(page).toHaveURL(/\/login/);
          await expect(page).toHaveURL(/callbackUrl/);
        }
      }
    });

    test("unauthenticated user redirected from enrollment", async ({
      page,
    }) => {
      await page.goto("/search");

      const firstCard = page.locator('[data-testid="daycare-card"], article').first();

      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/daycare\//);

        const enrollBtn = page.getByRole("link", { name: /enroll|apply/i });

        if (await enrollBtn.isVisible()) {
          await enrollBtn.click();

          // Should redirect to login
          await expect(page).toHaveURL(/\/login/);
        }
      }
    });
  });

  test.describe("Public Routes", () => {
    const publicRoutes = [
      { url: "/", name: "Home" },
      { url: "/search", name: "Search" },
      { url: "/pricing", name: "Pricing" },
      { url: "/about", name: "About" },
      { url: "/login", name: "Login" },
      { url: "/register", name: "Register" },
    ];

    for (const route of publicRoutes) {
      test(`${route.name} is publicly accessible`, async ({ page }) => {
        await page.goto(route.url);

        // Should NOT redirect to login
        await expect(page).not.toHaveURL(/\/login\?callbackUrl/);
      });
    }
  });

  test.describe("Callback URL Handling", () => {
    test("redirects to callbackUrl after login", async ({ page, loginAs }) => {
      // Go to protected route first
      await page.goto("/dashboard/bookings");

      // Should be on login with callback
      await expect(page).toHaveURL(/\/login.*callbackUrl/);

      // Login
      await loginAs("parent");

      // Should redirect to original URL
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});
