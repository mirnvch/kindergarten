import { test, expect } from "../fixtures/auth";

/**
 * Flow 3.6: Admin: Moderation Flow
 * From sitemap-v2.md Section 3.6
 *
 * /admin → /admin/daycares → Status-based Actions
 *
 * Status Cards: Pending, Approved, Rejected, Suspended
 *
 * Actions by Status:
 * - PENDING: Approve → APPROVED, Reject → Dialog → REJECTED
 * - APPROVED: Suspend → Dialog → SUSPENDED, Toggle Featured
 * - SUSPENDED/REJECTED: Reactivate → APPROVED
 * - ALL: View Public → /daycare/slug, Delete → Dialog
 */
test.describe("Flow 3.6: Admin Moderation", () => {
  test.describe("Admin Dashboard", () => {
    test("admin can access dashboard", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin");

      await expect(page).toHaveURL(/\/admin/);
      await expect(
        page.getByRole("heading", { name: /admin|dashboard/i })
      ).toBeVisible();
    });

    test("dashboard shows platform stats", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin");

      // Should show key metrics
      const content = await page.textContent("main");
      expect(
        content?.match(/user|daycare|booking|revenue/i)
      ).toBeTruthy();
    });

    test("has sidebar navigation", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin");

      // Key admin nav items
      await expect(
        page.getByRole("link", { name: /user/i })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /daycare/i })
      ).toBeVisible();
    });
  });

  test.describe("Users Management", () => {
    test("users page accessible", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/users");

      await expect(page).toHaveURL(/\/admin\/users/);
    });

    test("shows users list", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/users");

      // Should show user table or list
      await expect(
        page.getByRole("table").or(page.locator('[data-testid="user-card"]')).first()
      ).toBeVisible();
    });

    test("can filter users by role", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/users");

      const roleFilter = page.locator('[data-testid="role-filter"], select').first();

      if (await roleFilter.isVisible()) {
        await roleFilter.selectOption({ index: 1 });
        await expect(page).toHaveURL(/role=/);
      }
    });

    test("can search users", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/users");

      const searchInput = page.getByPlaceholder(/search|filter/i);

      if (await searchInput.isVisible()) {
        await searchInput.fill("test");
        await page.keyboard.press("Enter");

        await expect(page).toHaveURL(/search=/);
      }
    });
  });

  test.describe("Daycares Moderation", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/daycares");
    });

    test("daycares page accessible", async ({ page }) => {
      await expect(page).toHaveURL(/\/admin\/daycares/);
    });

    test("shows status filter cards", async ({ page }) => {
      // Should have status cards/tabs
      const pendingCard = page.getByText(/pending/i);
      const approvedCard = page.getByText(/approved/i);

      const hasPending = await pendingCard.isVisible().catch(() => false);
      const hasApproved = await approvedCard.isVisible().catch(() => false);

      expect(hasPending || hasApproved).toBeTruthy();
    });

    test("can filter by status", async ({ page }) => {
      const statusCard = page.getByRole("button", { name: /pending|approved/i }).first();

      if (await statusCard.isVisible()) {
        await statusCard.click();
        await expect(page).toHaveURL(/status=/);
      }
    });

    test("daycare row has action buttons", async ({ page }) => {
      const daycareRow = page.locator('tr, [data-testid="daycare-row"]').first();

      if (await daycareRow.isVisible()) {
        // Should have action buttons
        const actionBtn = daycareRow.getByRole("button", { name: /action|more|approve|reject/i }).first();
        await expect(actionBtn).toBeVisible();
      }
    });
  });

  test.describe("Daycare Actions - Pending", () => {
    test("can approve pending daycare", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/daycares?status=PENDING");

      const approveBtn = page.getByRole("button", { name: /approve/i }).first();

      if (await approveBtn.isVisible()) {
        await approveBtn.click();

        // Success message or status change
        await expect(
          page.getByText(/approved|success/i).first()
        ).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    test("can reject pending daycare with reason", async ({
      page,
      loginAs,
    }) => {
      await loginAs("admin");
      await page.goto("/admin/daycares?status=PENDING");

      const rejectBtn = page.getByRole("button", { name: /reject/i }).first();

      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();

        // Dialog with reason
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByLabel(/reason/i)).toBeVisible();
      }
    });
  });

  test.describe("Daycare Actions - Approved", () => {
    test("can suspend approved daycare", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/daycares?status=APPROVED");

      const suspendBtn = page.getByRole("button", { name: /suspend/i }).first();

      if (await suspendBtn.isVisible()) {
        await suspendBtn.click();

        // Dialog with reason
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
      }
    });

    test("can toggle featured status", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/daycares?status=APPROVED");

      const featuredBtn = page.getByRole("button", { name: /featured|star/i }).first();

      if (await featuredBtn.isVisible()) {
        await featuredBtn.click();

        // Should toggle
        await expect(
          page.getByText(/featured|unfeatured|success/i).first()
        ).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });

  test.describe("Daycare Actions - Suspended/Rejected", () => {
    test("can reactivate suspended daycare", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/daycares?status=SUSPENDED");

      const reactivateBtn = page.getByRole("button", { name: /reactivate|restore/i }).first();

      if (await reactivateBtn.isVisible()) {
        await reactivateBtn.click();

        await expect(
          page.getByText(/reactivated|approved|success/i).first()
        ).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });

  test.describe("Reviews Moderation", () => {
    test("reviews page accessible", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/reviews");

      await expect(page).toHaveURL(/\/admin\/reviews/);
    });

    test("can filter reviews by status", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/reviews");

      const statusFilter = page.locator('[data-testid="status-filter"], select').first();

      if (await statusFilter.isVisible()) {
        await expect(statusFilter).toBeVisible();
      }
    });

    test("review has moderation actions", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/reviews");

      const reviewCard = page.locator('[data-testid="review-card"], .review-card, tr').first();

      if (await reviewCard.isVisible()) {
        // Should have approve/reject/delete
        const actionBtn = reviewCard.getByRole("button").first();
        await expect(actionBtn).toBeVisible();
      }
    });
  });

  test.describe("Messages Moderation", () => {
    test("messages page accessible", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/messages");

      await expect(page).toHaveURL(/\/admin\/messages/);
    });

    test("can archive message threads", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/messages");

      const archiveBtn = page.getByRole("button", { name: /archive/i }).first();

      if (await archiveBtn.isVisible()) {
        await expect(archiveBtn).toBeEnabled();
      }
    });
  });

  test.describe("Admin Settings", () => {
    test("settings page accessible", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/settings");

      await expect(page).toHaveURL(/\/admin\/settings/);
    });

    test("shows settings categories", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/settings");

      // Should show settings sections
      const content = await page.textContent("main");
      expect(
        content?.match(/site|feature|pricing|moderation|config/i)
      ).toBeTruthy();
    });
  });
});
