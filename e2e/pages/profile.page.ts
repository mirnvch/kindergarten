/**
 * Profile Page Object.
 *
 * Encapsulates interactions with the user profile page.
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ProfilePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── URL ─────────────────────────────────────────────────────────────────────

  readonly url = "/dashboard/profile";

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  // ─── Tab Locators ────────────────────────────────────────────────────────────

  get personalInfoTab(): Locator {
    return this.page.getByRole("tab", { name: /personal|profile|info/i });
  }

  get securityTab(): Locator {
    return this.page.getByRole("tab", { name: /security|password/i });
  }

  get notificationsTab(): Locator {
    return this.page.getByRole("tab", { name: /notification/i });
  }

  // ─── Personal Info Locators ──────────────────────────────────────────────────

  get firstNameInput(): Locator {
    return this.page.getByLabel(/first name/i);
  }

  get lastNameInput(): Locator {
    return this.page.getByLabel(/last name/i);
  }

  get emailInput(): Locator {
    return this.page.getByLabel(/email/i);
  }

  get phoneInput(): Locator {
    return this.page.getByLabel(/phone/i);
  }

  get avatarUpload(): Locator {
    return this.page.locator('input[type="file"]');
  }

  get saveProfileButton(): Locator {
    return this.page.getByRole("button", { name: /save|update profile/i });
  }

  // ─── Security Locators ───────────────────────────────────────────────────────

  get currentPasswordInput(): Locator {
    return this.page.getByLabel(/current password/i);
  }

  get newPasswordInput(): Locator {
    return this.page.getByLabel(/new password/i);
  }

  get confirmPasswordInput(): Locator {
    return this.page.getByLabel(/confirm password/i);
  }

  get changePasswordButton(): Locator {
    return this.page.getByRole("button", { name: /change password|update password/i });
  }

  get enable2FAButton(): Locator {
    return this.page.getByRole("button", { name: /enable 2fa|enable two-factor/i });
  }

  get disable2FAButton(): Locator {
    return this.page.getByRole("button", { name: /disable 2fa|disable two-factor/i });
  }

  // ─── Notification Locators ───────────────────────────────────────────────────

  get emailNotificationsToggle(): Locator {
    return this.page.getByRole("switch", { name: /email notification/i });
  }

  get smsNotificationsToggle(): Locator {
    return this.page.getByRole("switch", { name: /sms|text notification/i });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Switch to a specific tab.
   */
  async switchToTab(tab: "personal" | "security" | "notifications"): Promise<void> {
    switch (tab) {
      case "personal":
        await this.personalInfoTab.click();
        break;
      case "security":
        await this.securityTab.click();
        break;
      case "notifications":
        await this.notificationsTab.click();
        break;
    }
  }

  /**
   * Update profile information.
   */
  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<void> {
    if (data.firstName) {
      await this.firstNameInput.fill(data.firstName);
    }
    if (data.lastName) {
      await this.lastNameInput.fill(data.lastName);
    }
    if (data.phone) {
      await this.phoneInput.fill(data.phone);
    }
    await this.saveProfileButton.click();
  }

  /**
   * Change password.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword?: string
  ): Promise<void> {
    await this.switchToTab("security");
    await this.currentPasswordInput.fill(currentPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword ?? newPassword);
    await this.changePasswordButton.click();
  }

  /**
   * Upload avatar image.
   */
  async uploadAvatar(filePath: string): Promise<void> {
    await this.avatarUpload.setInputFiles(filePath);
  }

  /**
   * Toggle email notifications.
   */
  async toggleEmailNotifications(): Promise<void> {
    await this.switchToTab("notifications");
    await this.emailNotificationsToggle.click();
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert profile page is loaded.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard\/profile/);
    await expect(this.main).toBeVisible();
  }

  /**
   * Assert profile form has expected values.
   */
  async expectFormValues(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<void> {
    if (data.firstName) {
      await expect(this.firstNameInput).toHaveValue(data.firstName);
    }
    if (data.lastName) {
      await expect(this.lastNameInput).toHaveValue(data.lastName);
    }
    if (data.email) {
      await expect(this.emailInput).toHaveValue(data.email);
    }
  }

  /**
   * Assert success message after update.
   */
  async expectUpdateSuccess(): Promise<void> {
    await expect(this.toast).toContainText(/saved|updated|success/i);
  }

  /**
   * Assert error message.
   */
  async expectError(message?: string | RegExp): Promise<void> {
    await expect(this.toast).toContainText(message ?? /error|failed/i);
  }
}
