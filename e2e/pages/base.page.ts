/**
 * Base Page Object class.
 *
 * Provides common functionality for all page objects.
 */

import { type Page, type Locator, expect } from "@playwright/test";

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  // ─── Common Elements ─────────────────────────────────────────────────────────

  /** Navigation header */
  get header(): Locator {
    return this.page.getByRole("banner");
  }

  /** Main content area */
  get main(): Locator {
    return this.page.getByRole("main");
  }

  /** Footer */
  get footer(): Locator {
    return this.page.getByRole("contentinfo");
  }

  /** User menu button (when authenticated) */
  get userMenuButton(): Locator {
    return this.page.getByRole("button", { name: /user|account|profile/i });
  }

  /** Toast/notification container */
  get toast(): Locator {
    return this.page.getByRole("alert");
  }

  // ─── Common Actions ──────────────────────────────────────────────────────────

  /**
   * Navigate to page URL.
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Check if user is authenticated by looking for user menu.
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.userMenuButton.waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open user dropdown menu.
   */
  async openUserMenu(): Promise<void> {
    await this.userMenuButton.click();
  }

  /**
   * Sign out from user menu.
   */
  async signOut(): Promise<void> {
    await this.openUserMenu();
    await this.page.getByRole("menuitem", { name: /sign out|log out/i }).click();
    await this.page.waitForURL(/\/(login)?$/);
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert page has expected URL.
   */
  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  /**
   * Assert page has expected title.
   */
  async expectTitle(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(pattern);
  }

  /**
   * Assert toast message is visible with text.
   */
  async expectToast(text: string | RegExp): Promise<void> {
    await expect(this.toast).toContainText(text);
  }

  /**
   * Assert element is visible.
   */
  async expectVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  /**
   * Assert element is hidden.
   */
  async expectHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
  }
}
