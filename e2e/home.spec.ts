import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the home page", async ({ page }) => {
    await page.goto("/");

    // Check that the page loads
    await expect(page).toHaveTitle(/KinderCare/i);
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for main navigation elements
    await expect(page.getByRole("link", { name: /search/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /pricing/i })).toBeVisible();
  });

  test("should navigate to search page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /search/i }).click();

    await expect(page).toHaveURL(/\/search/);
  });
});

test.describe("Search Page", () => {
  test("should display search form", async ({ page }) => {
    await page.goto("/search");

    // Check for search input
    await expect(
      page.getByPlaceholder(/city|location|search/i)
    ).toBeVisible();
  });
});

test.describe("Auth Pages", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /sign in|log in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("should display register page", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: /sign up|register|create/i })).toBeVisible();
  });

  test("should navigate from login to register", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: /sign up|register|create account/i }).click();

    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Pricing Page", () => {
  test("should display pricing plans", async ({ page }) => {
    await page.goto("/pricing");

    // Check for pricing page content
    await expect(page.getByRole("heading", { name: /pricing|plans/i })).toBeVisible();
  });
});
