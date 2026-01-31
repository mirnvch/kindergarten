import { test, expect } from "@playwright/test";

/**
 * Flow 3.1: Guest → Parent Registration
 * From sitemap-v2.md Section 3.1
 *
 * Entry Points → / (Home) → /register → /login → /dashboard
 *
 * Decision Points:
 * ◆ Has account? → /login
 * ◆ OAuth preferred? → Google button
 * ◆ 2FA enabled? → /login/verify-2fa
 */
test.describe("Flow 3.1: Guest → Parent Registration", () => {
  test.describe("Entry Points", () => {
    test("can access home page directly", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/KinderCare/i);
    });

    test("can access search page directly", async ({ page }) => {
      await page.goto("/search");
      await expect(page).toHaveURL(/\/search/);
    });

    test("can access pricing page directly", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page).toHaveURL(/\/pricing/);
    });

    test("can access login page directly", async ({ page }) => {
      await page.goto("/login");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Home → Register Flow", () => {
    test("should have Get Started CTA on home page", async ({ page }) => {
      await page.goto("/");

      // Look for registration CTA
      const ctaButton = page.getByRole("link", {
        name: /get started|sign up|register/i,
      });
      await expect(ctaButton).toBeVisible();
    });

    test("Get Started CTA navigates to register", async ({ page }) => {
      await page.goto("/");

      await page.getByRole("link", { name: /get started|sign up/i }).first().click();
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe("Registration Form", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/register");
    });

    test("displays registration form fields", async ({ page }) => {
      await expect(page.getByLabel(/first name/i)).toBeVisible();
      await expect(page.getByLabel(/last name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("displays Google OAuth button", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: /google|continue with google/i })
      ).toBeVisible();
    });

    test("has link to login for existing users", async ({ page }) => {
      const loginLink = page.getByRole("link", {
        name: /sign in|log in|already have/i,
      });
      await expect(loginLink).toBeVisible();

      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    });

    test("shows validation errors for empty form", async ({ page }) => {
      await page.getByRole("button", { name: /sign up|register|create/i }).click();

      // Should show validation errors
      await expect(page.getByText(/required|invalid/i).first()).toBeVisible();
    });

    test("shows password requirements", async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);
      await passwordInput.fill("weak");
      await passwordInput.blur();

      // Should show password requirement hints
      await expect(
        page.getByText(/8 characters|uppercase|lowercase|digit|special/i).first()
      ).toBeVisible();
    });
  });

  test.describe("Login Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("displays login form", async ({ page }) => {
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in|log in/i })
      ).toBeVisible();
    });

    test("has link to register for new users", async ({ page }) => {
      const registerLink = page.getByRole("link", {
        name: /sign up|register|create account/i,
      });
      await expect(registerLink).toBeVisible();

      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    });

    test("has forgot password link", async ({ page }) => {
      const forgotLink = page.getByRole("link", {
        name: /forgot|reset password/i,
      });
      await expect(forgotLink).toBeVisible();

      await forgotLink.click();
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test("shows error for invalid credentials", async ({ page }) => {
      await page.getByLabel(/email/i).fill("invalid@test.com");
      await page.getByLabel(/password/i).fill("wrongpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      // Should show error message
      await expect(
        page.getByText(/invalid|incorrect|wrong|not found/i).first()
      ).toBeVisible();
    });
  });

  test.describe("Forgot Password Flow", () => {
    test("displays forgot password form", async ({ page }) => {
      await page.goto("/forgot-password");

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /send|reset|submit/i })
      ).toBeVisible();
    });

    test("has link back to login", async ({ page }) => {
      await page.goto("/forgot-password");

      const backLink = page.getByRole("link", { name: /back|login|sign in/i });
      await expect(backLink).toBeVisible();
    });
  });
});
