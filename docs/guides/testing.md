# Testing Guide

Руководство по тестированию в проекте DocConnect.

---

## Содержание

1. [Стратегия тестирования](#стратегия-тестирования)
2. [Unit тесты (Vitest)](#unit-тесты-vitest)
3. [Integration тесты](#integration-тесты)
4. [E2E тесты (Playwright)](#e2e-тесты-playwright)
5. [Accessibility тесты](#accessibility-тесты)
6. [Test Factories](#test-factories)
7. [Моки и Fixtures](#моки-и-fixtures)
8. [CI/CD интеграция](#cicd-интеграция)

---

## Стратегия тестирования

### Пирамида тестов

```
          ┌─────────┐
          │  E2E    │  ~10% — критичные user flows
         ┌┴─────────┴┐
         │Integration │  ~20% — API routes, Server Actions
        ┌┴───────────┴┐
        │  Component   │  ~30% — формы, модалки, сложный UI
       ┌┴─────────────┴┐
       │     Unit       │  ~40% — utils, services, validators
       └───────────────┘
```

### Coverage Targets

| Слой        | Target | Что тестируем                      |
| ----------- | ------ | ---------------------------------- |
| Unit        | >80%   | `src/lib/`, `src/server/services/` |
| Integration | 100%   | Все Server Actions                 |
| Component   | >70%   | Формы, сложные компоненты          |
| E2E         | 100%   | Критичные user journeys            |

### Что мокаем

| Слой        | Мокаем                           | Не мокаем          |
| ----------- | -------------------------------- | ------------------ |
| Unit        | Repository, External APIs        | Zod schemas, Utils |
| Integration | Database (иногда), External APIs | Business logic     |
| E2E         | Ничего (real browser)            | -                  |

---

## Unit тесты (Vitest)

### Настройка

```bash
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @faker-js/faker
```

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/server/**", "src/hooks/**"],
      exclude: ["**/*.d.ts", "**/*.test.ts"],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### tests/setup.ts

```typescript
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "test-user-id" } })),
}));
```

### Примеры тестов

#### Utils

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { cn, formatDate, formatCurrency } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });
});

describe("formatCurrency", () => {
  it("formats USD", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
  });

  it("formats EUR", () => {
    expect(formatCurrency(1234.56, "EUR")).toBe("€1,234.56");
  });
});
```

#### Services (с моками)

```typescript
// tests/unit/services/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "@/server/services/user.service";
import { NotFoundError } from "@/lib/errors";
import { buildUser } from "@/tests/factories/user.factory";

describe("UserService", () => {
  const mockRepo = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
  };

  const service = new UserService(mockRepo as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("returns user when found", async () => {
      const user = buildUser();
      mockRepo.findById.mockResolvedValue(user);

      const result = await service.getById(user.id);

      expect(result).toEqual(user);
      expect(mockRepo.findById).toHaveBeenCalledWith(user.id);
    });

    it("throws NotFoundError when user not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getById("xxx")).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateProfile", () => {
    it("updates user profile", async () => {
      const user = buildUser();
      const updatedUser = { ...user, name: "New Name" };

      mockRepo.findById.mockResolvedValue(user);
      mockRepo.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(user.id, { name: "New Name" });

      expect(result.name).toBe("New Name");
    });
  });
});
```

#### Validators

```typescript
// tests/unit/validators/user.validators.test.ts
import { describe, it, expect } from "vitest";
import { updateProfileSchema, emailSchema } from "@/server/validators/user.validators";

describe("updateProfileSchema", () => {
  it("accepts valid data", () => {
    const result = updateProfileSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const result = updateProfileSchema.safeParse({ name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = updateProfileSchema.safeParse({ email: "not-email" });
    expect(result.success).toBe(false);
  });
});
```

---

## Integration тесты

### Server Actions

```typescript
// tests/integration/actions/user.actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProfile } from "@/server/actions/user.actions";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "user-123" } })),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("updateProfile action", () => {
  it("updates profile successfully", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma.user.findUnique as any).mockResolvedValue({ id: "user-123" });
    (prisma.user.update as any).mockResolvedValue({ id: "user-123", name: "New" });

    const result = await updateProfile({ name: "New" });

    expect(result.success).toBe(true);
    expect(result.data.name).toBe("New");
  });

  it("returns error for invalid data", async () => {
    const result = await updateProfile({ name: "" });

    expect(result.success).toBe(false);
    expect(result.code).toBe("VALIDATION_ERROR");
  });
});
```

---

## E2E тесты (Playwright)

### Структура

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts     # Auth setup
│   ├── db.fixture.ts       # Database setup
│   └── test-data.ts        # Shared test data
├── pages/                   # Page Objects
│   ├── home.page.ts
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── profile.page.ts
├── flows/                   # User journeys
│   ├── auth.spec.ts
│   ├── profile.spec.ts
│   └── booking.spec.ts
├── accessibility/           # A11y tests
│   └── pages.spec.ts
└── home.spec.ts             # Basic smoke tests
```

### Auth Fixture

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, Page } from "@playwright/test";

export const TEST_ACCOUNTS = {
  user: {
    email: "test@example.com",
    password: "Test123!",
  },
  admin: {
    email: "admin@example.com",
    password: "Admin123!",
  },
};

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_ACCOUNTS.user.email);
    await page.getByLabel(/password/i).fill(TEST_ACCOUNTS.user.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_ACCOUNTS.admin.email);
    await page.getByLabel(/password/i).fill(TEST_ACCOUNTS.admin.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/admin/);
    await use(page);
  },
});

export { expect } from "@playwright/test";
```

### Page Object

```typescript
// e2e/pages/dashboard.page.ts
import { Page, expect } from "@playwright/test";

export class DashboardPage {
  constructor(private page: Page) {}

  // Locators
  readonly heading = this.page.getByRole("heading", { name: /dashboard/i });
  readonly profileLink = this.page.getByRole("link", { name: /profile/i });
  readonly bookingsTab = this.page.getByRole("tab", { name: /bookings/i });
  readonly logoutButton = this.page.getByRole("button", { name: /logout|sign out/i });

  // Actions
  async navigateToProfile() {
    await this.profileLink.click();
    await this.page.waitForURL(/profile/);
  }

  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL(/login|\//);
  }

  // Assertions
  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async expectBookingsCount(count: number) {
    const bookings = this.page.getByTestId("booking-card");
    await expect(bookings).toHaveCount(count);
  }
}
```

### Flow Test

```typescript
// e2e/flows/profile.spec.ts
import { test, expect } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/dashboard.page";
import { ProfilePage } from "../pages/profile.page";

test.describe("User Profile Flow", () => {
  test("user can view and update profile", async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    const profile = new ProfilePage(authenticatedPage);

    // Navigate to profile
    await dashboard.expectLoaded();
    await dashboard.navigateToProfile();

    // Update name
    await profile.updateName("John Updated");

    // Verify success
    await profile.expectSuccessMessage();
    await expect(profile.nameInput).toHaveValue("John Updated");
  });

  test("user cannot access admin pages", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/admin");
    await expect(authenticatedPage).toHaveURL(/login|forbidden/);
  });
});
```

---

## Accessibility тесты

### Setup

```bash
npm install -D @axe-core/playwright
```

### A11y Tests

```typescript
// e2e/accessibility/pages.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicPages = ["/", "/login", "/register", "/search", "/pricing"];

test.describe("Accessibility", () => {
  for (const path of publicPages) {
    test(`${path} has no critical a11y violations`, async ({ page }) => {
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(critical).toEqual([]);
    });
  }
});
```

---

## Test Factories

```typescript
// tests/factories/user.factory.ts
import { faker } from "@faker-js/faker";
import { type User, Role } from "@prisma/client";

export function buildUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.cuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: Role.USER,
    emailVerified: null,
    image: null,
    createdAt: faker.date.recent(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildAdmin(overrides?: Partial<User>): User {
  return buildUser({ role: Role.ADMIN, ...overrides });
}

// Для E2E — seed в БД
export async function seedUser(prisma: PrismaClient, overrides?: Partial<User>): Promise<User> {
  return prisma.user.create({
    data: buildUser(overrides),
  });
}
```

---

## Моки и Fixtures

### MSW для External APIs

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // Stripe
  http.post("https://api.stripe.com/v1/customers", () => {
    return HttpResponse.json({ id: "cus_test123" });
  }),

  // Resend
  http.post("https://api.resend.com/emails", () => {
    return HttpResponse.json({ id: "email_test123" });
  }),
];
```

---

## CI/CD интеграция

### GitHub Actions

```yaml
# .github/workflows/ci.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e -- --project=chromium
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### NPM Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:a11y": "playwright test e2e/accessibility/"
  }
}
```

---

_См. также:_

- [Frontend Guide](./frontend.md)
- [Backend Guide](./backend.md)
- [CI/CD Setup](../architecture/overview.md)
