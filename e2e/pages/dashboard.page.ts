/**
 * Dashboard Page Object.
 *
 * Encapsulates interactions with the parent dashboard.
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── URL ─────────────────────────────────────────────────────────────────────

  readonly url = "/dashboard";

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  // ─── Navigation Locators ─────────────────────────────────────────────────────

  get sidebar(): Locator {
    return this.page.getByRole("navigation", { name: /sidebar|main/i });
  }

  get homeLink(): Locator {
    return this.page.getByRole("link", { name: /home|dashboard|overview/i });
  }

  get bookingsLink(): Locator {
    return this.page.getByRole("link", { name: /booking|appointment/i });
  }

  get familyLink(): Locator {
    return this.page.getByRole("link", { name: /family|children/i });
  }

  get profileLink(): Locator {
    return this.page.getByRole("link", { name: /profile|settings|account/i });
  }

  // ─── Content Locators ────────────────────────────────────────────────────────

  get welcomeMessage(): Locator {
    return this.page.getByRole("heading", { name: /welcome|hello|hi/i });
  }

  get upcomingAppointments(): Locator {
    return this.page.getByRole("region", { name: /upcoming|next appointment/i });
  }

  get appointmentCards(): Locator {
    return this.page.locator('[data-testid="appointment-card"]');
  }

  get emptyState(): Locator {
    return this.page.getByText(/no appointments|no bookings|nothing scheduled/i);
  }

  get findDaycareButton(): Locator {
    return this.page.getByRole("link", { name: /find|search|browse/i });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Navigate to bookings page.
   */
  async goToBookings(): Promise<void> {
    await this.bookingsLink.click();
    await this.page.waitForURL(/\/dashboard\/bookings/);
  }

  /**
   * Navigate to family members page.
   */
  async goToFamily(): Promise<void> {
    await this.familyLink.click();
    await this.page.waitForURL(/\/dashboard\/family/);
  }

  /**
   * Navigate to profile page.
   */
  async goToProfile(): Promise<void> {
    await this.profileLink.click();
    await this.page.waitForURL(/\/dashboard\/profile/);
  }

  /**
   * Click on find daycare button.
   */
  async clickFindDaycare(): Promise<void> {
    await this.findDaycareButton.click();
    await this.page.waitForURL(/\/search/);
  }

  /**
   * Click on a specific appointment card.
   */
  async clickAppointment(index: number = 0): Promise<void> {
    await this.appointmentCards.nth(index).click();
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert dashboard is loaded.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(this.main).toBeVisible();
  }

  /**
   * Assert welcome message is visible.
   */
  async expectWelcome(name?: string): Promise<void> {
    if (name) {
      await expect(this.welcomeMessage).toContainText(name);
    } else {
      await expect(this.welcomeMessage).toBeVisible();
    }
  }

  /**
   * Assert has upcoming appointments.
   */
  async expectHasAppointments(): Promise<void> {
    await expect(this.appointmentCards.first()).toBeVisible();
  }

  /**
   * Assert empty state is shown.
   */
  async expectEmpty(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Assert specific number of appointments visible.
   */
  async expectAppointmentCount(count: number): Promise<void> {
    await expect(this.appointmentCards).toHaveCount(count);
  }
}
