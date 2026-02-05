/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page } from "@playwright/test";

/**
 * Test accounts from seed.ts
 * These accounts should exist in the test database
 */
export const TEST_ACCOUNTS = {
  parent: {
    email: "john.patient@example.com",
    password: "Test123!",
    role: "PATIENT",
  },
  owner: {
    email: "dr.martinez@example.com",
    password: "Test123!",
    role: "PROVIDER",
  },
  admin: {
    email: "admin@docconnect.com",
    password: "Test123!",
    role: "ADMIN",
  },
} as const;

type AccountType = keyof typeof TEST_ACCOUNTS;

/**
 * Login helper function
 */
export async function login(
  page: Page,
  accountType: AccountType,
  options?: { expect2FA?: boolean }
) {
  const account = TEST_ACCOUNTS[accountType];

  await page.goto("/login");

  // Fill credentials
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByRole("textbox", { name: /password/i }).fill(account.password);

  // Submit
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  if (options?.expect2FA) {
    // Wait for 2FA page
    await expect(page).toHaveURL(/\/login\/verify-2fa/);
  } else {
    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|portal|admin)/, { timeout: 10000 });
  }
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Click user menu and sign out
  await page.getByRole("button", { name: /user|account|profile/i }).click();
  await page.getByRole("menuitem", { name: /sign out|log out/i }).click();

  // Wait for redirect to home or login
  await page.waitForURL(/\/(login)?$/);
}

/**
 * Extended test fixture with auth helpers
 */
export const test = base.extend<{
  loginAs: (accountType: AccountType) => Promise<void>;
  authenticatedPage: Page;
}>({
  loginAs: async ({ page }, use) => {
    const loginAs = async (accountType: AccountType) => {
      await login(page, accountType);
    };
    await use(loginAs);
  },

  authenticatedPage: async ({ page }, use) => {
    // Pre-authenticated page (parent by default)
    await login(page, "parent");
    await use(page);
  },
});

export { expect } from "@playwright/test";
