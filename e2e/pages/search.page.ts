/**
 * Search Page Object.
 *
 * Encapsulates interactions with the daycare search page.
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class SearchPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── URL ─────────────────────────────────────────────────────────────────────

  readonly url = "/search";

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  // ─── Search Form Locators ────────────────────────────────────────────────────

  get searchInput(): Locator {
    return this.page.getByRole("searchbox").or(this.page.getByPlaceholder(/search|location|city/i));
  }

  get searchButton(): Locator {
    return this.page.getByRole("button", { name: /search|find/i });
  }

  get filterButton(): Locator {
    return this.page.getByRole("button", { name: /filter/i });
  }

  get sortDropdown(): Locator {
    return this.page.getByRole("combobox", { name: /sort/i });
  }

  // ─── Filter Locators ─────────────────────────────────────────────────────────

  get priceRangeSlider(): Locator {
    return this.page.getByRole("slider", { name: /price/i });
  }

  get ratingFilter(): Locator {
    return this.page.getByRole("group", { name: /rating/i });
  }

  get distanceFilter(): Locator {
    return this.page.getByRole("slider", { name: /distance/i });
  }

  get applyFiltersButton(): Locator {
    return this.page.getByRole("button", { name: /apply|filter/i });
  }

  get clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: /clear|reset/i });
  }

  // ─── Results Locators ────────────────────────────────────────────────────────

  get resultCards(): Locator {
    return this.page.locator('[data-testid="provider-card"]').or(this.page.getByRole("article"));
  }

  get resultCount(): Locator {
    return this.page.getByText(/\d+ results?|found \d+/i);
  }

  get emptyState(): Locator {
    return this.page.getByText(/no results|no daycares|nothing found/i);
  }

  get loadingIndicator(): Locator {
    return this.page.getByRole("progressbar").or(this.page.getByText(/loading/i));
  }

  get mapView(): Locator {
    return this.page
      .locator('[data-testid="map"]')
      .or(this.page.getByRole("application", { name: /map/i }));
  }

  get listViewButton(): Locator {
    return this.page.getByRole("button", { name: /list/i });
  }

  get mapViewButton(): Locator {
    return this.page.getByRole("button", { name: /map/i });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Search for daycares.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.waitForResults();
  }

  /**
   * Wait for search results to load.
   */
  async waitForResults(): Promise<void> {
    // Wait for loading to finish
    await this.loadingIndicator.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    // Wait for either results or empty state
    await Promise.race([
      this.resultCards.first().waitFor({ state: "visible", timeout: 10000 }),
      this.emptyState.waitFor({ state: "visible", timeout: 10000 }),
    ]).catch(() => {});
  }

  /**
   * Open filters panel.
   */
  async openFilters(): Promise<void> {
    await this.filterButton.click();
  }

  /**
   * Apply current filters.
   */
  async applyFilters(): Promise<void> {
    await this.applyFiltersButton.click();
    await this.waitForResults();
  }

  /**
   * Clear all filters.
   */
  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.waitForResults();
  }

  /**
   * Sort results.
   */
  async sortBy(option: string): Promise<void> {
    await this.sortDropdown.selectOption(option);
    await this.waitForResults();
  }

  /**
   * Switch to map view.
   */
  async switchToMapView(): Promise<void> {
    await this.mapViewButton.click();
  }

  /**
   * Switch to list view.
   */
  async switchToListView(): Promise<void> {
    await this.listViewButton.click();
  }

  /**
   * Click on a specific result card.
   */
  async clickResult(index: number = 0): Promise<void> {
    await this.resultCards.nth(index).click();
  }

  /**
   * Get result card by provider name.
   */
  getResultByName(name: string): Locator {
    return this.resultCards.filter({ hasText: name });
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  /**
   * Assert search page is loaded.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/search/);
    await expect(this.searchInput).toBeVisible();
  }

  /**
   * Assert has results.
   */
  async expectHasResults(): Promise<void> {
    await expect(this.resultCards.first()).toBeVisible();
  }

  /**
   * Assert no results.
   */
  async expectNoResults(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Assert specific number of results.
   */
  async expectResultCount(count: number): Promise<void> {
    await expect(this.resultCards).toHaveCount(count);
  }

  /**
   * Assert result contains text.
   */
  async expectResultContains(text: string): Promise<void> {
    await expect(this.resultCards.filter({ hasText: text }).first()).toBeVisible();
  }

  /**
   * Assert URL contains search parameters.
   */
  async expectSearchParams(params: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(params)) {
      await expect(this.page).toHaveURL(new RegExp(`${key}=${encodeURIComponent(value)}`));
    }
  }
}
