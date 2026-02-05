/**
 * Example tests demonstrating the Page Object Model pattern.
 *
 * These tests show how to use Page Objects for cleaner, more maintainable tests.
 */

import { test, expect, TEST_ACCOUNTS } from "../fixtures/auth";
import { LoginPage, SearchPage, DashboardPage } from "../pages";

test.describe("Page Object Model Examples", () => {
  test.describe("Using Page Object Fixtures", () => {
    /**
     * Example: Using injected page object fixture
     */
    test("login with page object fixture", async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.expectFormVisible();

      // Fill form using page object methods
      await loginPage.fillEmail(TEST_ACCOUNTS.parent.email);
      await loginPage.fillPassword(TEST_ACCOUNTS.parent.password);
      await loginPage.submit();

      // Wait for redirect
      await expect(loginPage["page"]).toHaveURL(/\/dashboard/);
    });

    /**
     * Example: Using search page object
     */
    test("search daycares with page object", async ({ searchPage }) => {
      await searchPage.goto();
      await searchPage.expectLoaded();

      // Perform search
      await searchPage.search("New York");

      // Check results
      await searchPage.expectHasResults();
    });
  });

  test.describe("Using Pre-authenticated Fixtures", () => {
    /**
     * Example: Using parentPage fixture (pre-authenticated)
     */
    test("parent dashboard is accessible", async ({ parentPage }) => {
      const dashboard = new DashboardPage(parentPage);

      await dashboard.goto();
      await dashboard.expectLoaded();
    });

    /**
     * Example: Using ownerPage fixture
     */
    test("owner portal is accessible", async ({ ownerPage }) => {
      // Owner is already logged in, should be on portal
      await expect(ownerPage).toHaveURL(/\/portal/);
    });

    /**
     * Example: Using adminPage fixture
     */
    test("admin panel is accessible", async ({ adminPage }) => {
      // Admin is already logged in, should be on admin panel
      await expect(adminPage).toHaveURL(/\/admin/);
    });
  });

  test.describe("Creating Page Objects Manually", () => {
    /**
     * Example: Creating page object in test
     */
    test("login flow with manually created page object", async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();

      // Check form elements
      await loginPage.expectFormVisible();

      // Navigate to register
      await loginPage.goToRegister();
      await expect(page).toHaveURL(/\/register/);
    });

    /**
     * Example: Multiple page objects in one test
     */
    test("search and view results", async ({ page }) => {
      const searchPage = new SearchPage(page);

      // Go to search
      await searchPage.goto();
      await searchPage.expectLoaded();

      // Search for something
      await searchPage.search("childcare");

      // Verify we have results or empty state
      const hasResults = (await searchPage.resultCards.count()) > 0;

      if (hasResults) {
        await searchPage.expectHasResults();
      } else {
        await searchPage.expectNoResults();
      }
    });
  });

  test.describe("Using loginAs Fixture", () => {
    /**
     * Example: Login as different users dynamically
     */
    test("loginAs different roles", async ({ page, loginAs }) => {
      // Login as parent
      await loginAs("parent");
      await expect(page).toHaveURL(/\/dashboard/);

      // You could logout and login as another role here
    });
  });
});
