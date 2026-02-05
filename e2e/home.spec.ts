import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the home page", async ({ page }) => {
    await page.goto("/");

    // Check that the page loads with DocConnect title
    await expect(page).toHaveTitle(/DocConnect/i);
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for navigation in header
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Find Providers" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pricing" })).toBeVisible();
  });

  test("should navigate to search page", async ({ page }) => {
    await page.goto("/");

    // Click the "Find Providers" link in header navigation
    const nav = page.getByRole("navigation");
    await Promise.all([
      page.waitForURL(/\/search/),
      nav.getByRole("link", { name: "Find Providers" }).click(),
    ]);

    await expect(page).toHaveURL(/\/search/);
  });
});

test.describe("Search Page", () => {
  test("should display search results", async ({ page }) => {
    await page.goto("/search");

    // Check that search page loads with providers
    await expect(page.getByRole("heading", { name: /providers|results/i }).first()).toBeVisible();
  });
});

test.describe("Auth Pages", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    // Check for login form elements
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("should display register page", async ({ page }) => {
    await page.goto("/register");

    // Check for register page heading
    await expect(page.getByRole("heading", { name: /create.*account|get started/i })).toBeVisible();
  });

  test("should navigate from login to register", async ({ page }) => {
    await page.goto("/login");

    // Find and click the register link
    await page.getByRole("link", { name: /sign up|create account|register/i }).click();

    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Pricing Page", () => {
  test("should display pricing plans", async ({ page }) => {
    await page.goto("/pricing");

    // Check for pricing page content using level 1 heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
