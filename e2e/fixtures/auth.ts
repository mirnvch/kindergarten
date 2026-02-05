/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Page } from "@playwright/test";
import { LoginPage, DashboardPage, ProfilePage, SearchPage, RegisterPage } from "../pages";

/**
 * Test accounts from seed.ts
 * These accounts should exist in the test database
 */
export const TEST_ACCOUNTS = {
  parent: {
    email: "john.patient@example.com",
    password: "Test123!",
    role: "PATIENT",
    firstName: "John",
    lastName: "Patient",
  },
  owner: {
    email: "dr.martinez@example.com",
    password: "Test123!",
    role: "PROVIDER",
    firstName: "Maria",
    lastName: "Martinez",
  },
  admin: {
    email: "admin@docconnect.com",
    password: "Test123!",
    role: "ADMIN",
    firstName: "Admin",
    lastName: "User",
  },
} as const;

export type AccountType = keyof typeof TEST_ACCOUNTS;

/**
 * Login helper function
 */
export async function login(
  page: Page,
  accountType: AccountType,
  options?: { expect2FA?: boolean }
) {
  const account = TEST_ACCOUNTS[accountType];
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(account.email, account.password);

  if (options?.expect2FA) {
    await loginPage.expectRedirectTo2FA();
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
 * Page Object fixtures type
 */
type PageObjectFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  profilePage: ProfilePage;
  searchPage: SearchPage;
};

/**
 * Auth fixtures type
 */
type AuthFixtures = {
  loginAs: (accountType: AccountType) => Promise<void>;
  authenticatedPage: Page;
  parentPage: Page;
  ownerPage: Page;
  adminPage: Page;
};

/**
 * Extended test fixture with auth helpers and page objects
 */
export const test = base.extend<PageObjectFixtures & AuthFixtures>({
  // ─── Page Object Fixtures ────────────────────────────────────────────────────

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },

  // ─── Auth Fixtures ───────────────────────────────────────────────────────────

  loginAs: async ({ page }, use) => {
    const loginAs = async (accountType: AccountType) => {
      await login(page, accountType);
    };
    await use(loginAs);
  },

  /**
   * Pre-authenticated page (parent by default)
   * @deprecated Use parentPage, ownerPage, or adminPage instead
   */
  authenticatedPage: async ({ page }, use) => {
    await login(page, "parent");
    await use(page);
  },

  /**
   * Page authenticated as parent user
   */
  parentPage: async ({ page }, use) => {
    await login(page, "parent");
    await use(page);
  },

  /**
   * Page authenticated as daycare owner
   */
  ownerPage: async ({ page }, use) => {
    await login(page, "owner");
    await use(page);
  },

  /**
   * Page authenticated as admin
   */
  adminPage: async ({ page }, use) => {
    await login(page, "admin");
    await use(page);
  },
});

export { expect } from "@playwright/test";
