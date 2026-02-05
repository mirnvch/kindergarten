/**
 * Register Page Object.
 *
 * Encapsulates all interactions with the registration page.
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── URL ─────────────────────────────────────────────────────────────────────

  readonly url = "/register";

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  // ─── Locators ────────────────────────────────────────────────────────────────

  get firstNameInput(): Locator {
    return this.page.getByLabel(/first name/i);
  }

  get lastNameInput(): Locator {
    return this.page.getByLabel(/last name/i);
  }

  get emailInput(): Locator {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput(): Locator {
    return this.page.getByLabel(/^password$/i);
  }

  get confirmPasswordInput(): Locator {
    return this.page.getByLabel(/confirm password/i);
  }

  get submitButton(): Locator {
    return this.page.getByRole("button", { name: /sign up|register|create account/i });
  }

  get googleButton(): Locator {
    return this.page.getByRole("button", { name: /google|continue with google/i });
  }

  get loginLink(): Locator {
    return this.page.getByRole("link", { name: /sign in|log in|already have/i });
  }

  get termsCheckbox(): Locator {
    return this.page.getByRole("checkbox", { name: /terms|agree/i });
  }

  get errorMessage(): Locator {
    return this.page.getByRole("alert");
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Fill registration form.
   */
  async fillForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);

    if (data.confirmPassword) {
      await this.confirmPasswordInput.fill(data.confirmPassword);
    }
  }

  /**
   * Accept terms if checkbox exists.
   */
  async acceptTerms(): Promise<void> {
    const checkbox = this.termsCheckbox;
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }
  }

  /**
   * Submit the registration form.
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Complete registration flow.
   */
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.fillForm(data);
    await this.acceptTerms();
    await this.submit();
  }

  /**
   * Navigate to login page.
   */
  async goToLogin(): Promise<void> {
    await this.loginLink.click();
    await this.page.waitForURL(/\/login/);
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert form is visible.
   */
  async expectFormVisible(): Promise<void> {
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Assert validation error for a field.
   */
  async expectFieldError(fieldName: string, message?: string | RegExp): Promise<void> {
    const errorLocator = this.page.getByText(message ?? /required|invalid/i);
    await expect(errorLocator.first()).toBeVisible();
  }

  /**
   * Assert password requirements visible.
   */
  async expectPasswordRequirements(): Promise<void> {
    await expect(
      this.page.getByText(/8 characters|uppercase|lowercase|digit|special/i).first()
    ).toBeVisible();
  }

  /**
   * Assert registration success (usually redirects to verify email or dashboard).
   */
  async expectSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(verify-email|dashboard|login)/);
  }
}
