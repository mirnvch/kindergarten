/**
 * Login Page Object.
 *
 * Encapsulates all interactions with the login page.
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── URL ─────────────────────────────────────────────────────────────────────

  readonly url = "/login";

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  // ─── Locators ────────────────────────────────────────────────────────────────

  get emailInput(): Locator {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput(): Locator {
    return this.page.getByRole("textbox", { name: /password/i });
  }

  get submitButton(): Locator {
    return this.page.getByRole("button", { name: /sign in|log in/i });
  }

  get googleButton(): Locator {
    return this.page.getByRole("button", { name: /google|continue with google/i });
  }

  get registerLink(): Locator {
    return this.page.getByRole("link", { name: /sign up|register|create account/i });
  }

  get forgotPasswordLink(): Locator {
    return this.page.getByRole("link", { name: /forgot|reset password/i });
  }

  get errorMessage(): Locator {
    return this.page.getByRole("alert");
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Fill email field.
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field.
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form.
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with credentials.
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Login and wait for dashboard redirect.
   */
  async loginAndWait(
    email: string,
    password: string,
    expectedUrl: RegExp = /\/(dashboard|portal|admin)/
  ): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(expectedUrl, { timeout: 10000 });
  }

  /**
   * Navigate to register page.
   */
  async goToRegister(): Promise<void> {
    await this.registerLink.click();
    await this.page.waitForURL(/\/register/);
  }

  /**
   * Navigate to forgot password page.
   */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL(/\/forgot-password/);
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert form is visible.
   */
  async expectFormVisible(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Assert error message is displayed.
   */
  async expectError(message?: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  /**
   * Assert redirected to 2FA verification.
   */
  async expectRedirectTo2FA(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login\/verify-2fa/);
  }
}
