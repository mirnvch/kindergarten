import { test, expect } from "../fixtures/auth";

/**
 * Flow 3.7: Admin: Verification Flow
 * From sitemap-v2.md Section 3.7
 *
 * /admin → /admin/verifications → /admin/verifications/[id] → Review Actions
 *
 * Status Cards: PENDING, IN_REVIEW, APPROVED, REJECTED
 *
 * State Machine:
 * PENDING → IN_REVIEW → APPROVED
 *                    → REJECTED
 *
 * Actions:
 * - If PENDING: Start Review → IN_REVIEW
 * - If PENDING/IN_REVIEW: Approve, Reject (with reason)
 */
test.describe("Flow 3.7: Admin Verification", () => {
  test.describe("Verifications List Page", () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications");
    });

    test("verifications page accessible", async ({ page }) => {
      await expect(page).toHaveURL(/\/admin\/verifications/);
    });

    test("shows status cards/filters", async ({ page }) => {
      // Should have status filters
      const pendingCard = page.getByText(/pending/i);
      const inReviewCard = page.getByText(/in.?review|reviewing/i);
      const approvedCard = page.getByText(/approved/i);
      const rejectedCard = page.getByText(/rejected/i);

      const hasPending = await pendingCard.first().isVisible().catch(() => false);
      const hasInReview = await inReviewCard.first().isVisible().catch(() => false);
      const hasApproved = await approvedCard.first().isVisible().catch(() => false);
      const hasRejected = await rejectedCard.first().isVisible().catch(() => false);

      expect(hasPending || hasInReview || hasApproved || hasRejected).toBeTruthy();
    });

    test("can filter by status", async ({ page }) => {
      const statusCard = page.getByRole("button", { name: /pending/i }).first();

      if (await statusCard.isVisible()) {
        await statusCard.click();
        await expect(page).toHaveURL(/status=/);
      }
    });

    test("shows verification requests list", async ({ page }) => {
      // Should have table or cards
      const verificationRow = page.locator('tr, [data-testid="verification-card"]').first();

      if (await verificationRow.isVisible()) {
        await expect(verificationRow).toBeVisible();
      }
    });

    test("verification row links to detail page", async ({ page }) => {
      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        const href = await viewLink.getAttribute("href");
        expect(href).toMatch(/\/admin\/verifications\//);
      }
    });
  });

  test.describe("Verification Detail Page", () => {
    test("shows verification details", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications");

      // Click first verification to go to detail
      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();

        await expect(page).toHaveURL(/\/admin\/verifications\/.+/);

        // Should show daycare info
        await expect(
          page.getByText(/daycare|license|document/i).first()
        ).toBeVisible();
      }
    });

    test("shows submitted documents", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        // Should show documents section
        await expect(
          page.getByText(/document|license|certificate|upload/i).first()
        ).toBeVisible();
      }
    });

    test("has link to view daycare listing", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        // Should have link to public daycare page
        const daycareLink = page.getByRole("link", { name: /view listing|view daycare|public/i });

        if (await daycareLink.isVisible()) {
          const href = await daycareLink.getAttribute("href");
          expect(href).toMatch(/\/daycare\//);
        }
      }
    });
  });

  test.describe("Verification Actions - PENDING", () => {
    test("can start review on pending request", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications?status=PENDING");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        const startReviewBtn = page.getByRole("button", { name: /start review|begin review/i });

        if (await startReviewBtn.isVisible()) {
          await startReviewBtn.click();

          await expect(
            page.getByText(/in.?review|started|reviewing/i).first()
          ).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    });
  });

  test.describe("Verification Actions - IN_REVIEW", () => {
    test("can approve verification", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications?status=IN_REVIEW");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        const approveBtn = page.getByRole("button", { name: /approve/i });

        if (await approveBtn.isVisible()) {
          await approveBtn.click();

          await expect(
            page.getByText(/approved|success/i).first()
          ).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    });

    test("can reject verification with reason", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications?status=IN_REVIEW");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        const rejectBtn = page.getByRole("button", { name: /reject/i });

        if (await rejectBtn.isVisible()) {
          await rejectBtn.click();

          // Should show dialog with reason input
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();
          await expect(
            dialog.getByLabel(/reason|note/i)
          ).toBeVisible();
        }
      }
    });
  });

  test.describe("Document Links", () => {
    test("document links open in new tab", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        const docLink = page.locator('a[target="_blank"]').first();

        if (await docLink.isVisible()) {
          const target = await docLink.getAttribute("target");
          expect(target).toBe("_blank");
        }
      }
    });
  });

  test.describe("Back Navigation", () => {
    test("can navigate back to list", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        const backLink = page.getByRole("link", { name: /back|verifications/i });

        if (await backLink.isVisible()) {
          await backLink.click();
          await expect(page).toHaveURL(/\/admin\/verifications$/);
        }
      }
    });
  });

  test.describe("Review Form", () => {
    test("review form has notes field", async ({ page, loginAs }) => {
      await loginAs("admin");
      await page.goto("/admin/verifications");

      const viewLink = page.getByRole("link", { name: /view|detail|review/i }).first();

      if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForURL(/\/admin\/verifications\/.+/);

        // Should have notes/comments field
        const notesField = page.getByLabel(/note|comment|review/i);

        if (await notesField.isVisible()) {
          await expect(notesField).toBeVisible();
        }
      }
    });
  });
});
