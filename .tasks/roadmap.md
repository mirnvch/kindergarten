# 🗺️ Development Roadmap: от MVP до Production-Grade

Дорожная карта улучшений Next.js проекта, основанная на лучших мировых практиках разработки.
Каждая фаза строится на предыдущей. Порядок оптимизирован по принципу **максимальный impact при минимальном effort**.

---

## Как читать эту карту

- **🔴 Критично** — без этого нельзя выходить в production
- **🟡 Важно** — значительно повышает качество и стабильность
- **🟢 Полезно** — профессиональный уровень, масштабирование
- **⏱️ Время** — реалистичная оценка для одного разработчика
- **📦 Deliverable** — конкретный артефакт на выходе

---

## Phase 0: Foundation Hardening (Неделя 1)

> **Цель:** Укрепить фундамент, который уже заложен в RECOMMENDATIONS.md.
> Без этой фазы всё остальное — строительство на песке.

### 0.1 🔴 Типизированная система ошибок (День 1, ~2-3 часа)

**Проблема:** Примитивный `try/catch` с `return { error: "Failed" }` — нет контекста, нет типизации, невозможно отличить 404 от 500.

**Что делаем:**

```
src/lib/errors/
├── app-error.ts          # Базовый класс ошибок
├── error-codes.ts        # Enum всех кодов ошибок
├── error-handler.ts      # Централизованный обработчик
└── index.ts              # Реэкспорт
```

**Паттерн:**

```typescript
// src/lib/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, 400, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ErrorCode.NOT_FOUND, 404, `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(ErrorCode.UNAUTHORIZED, 401, "Unauthorized");
  }
}
```

**📦 Deliverable:** `src/lib/errors/` — переиспользуемый модуль ошибок

---

### 0.2 🔴 createSafeAction wrapper (День 1, ~2-3 часа)

**Проблема:** Каждый Server Action повторяет один и тот же boilerplate: auth check → validate → try/catch → error handling.

**Что делаем:**

```typescript
// src/lib/safe-action.ts
import { z } from "zod";
import { auth } from "@/lib/auth";
import { AppError, UnauthorizedError } from "@/lib/errors";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (data: TInput, userId: string) => Promise<TOutput>,
  options?: { requireAuth?: boolean }
) {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      // Auth check
      if (options?.requireAuth !== false) {
        const session = await auth();
        if (!session?.user?.id) throw new UnauthorizedError();
      }

      // Validation
      const validated = schema.safeParse(input);
      if (!validated.success) {
        return {
          success: false,
          error: validated.error.errors[0].message,
          code: "VALIDATION_ERROR",
        };
      }

      // Execute
      const session = await auth();
      const data = await handler(validated.data, session!.user!.id);
      return { success: true, data };
    } catch (error) {
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.code };
      }
      // Log unexpected errors to Sentry
      console.error("Unexpected error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };
}
```

**Использование (вместо текущего паттерна):**

```typescript
// БЫЛО (30+ строк boilerplate)
export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const validated = schema.safeParse({ name: formData.get("name") });
  if (!validated.success) return { success: false, error: "Invalid" };
  try { ... } catch { ... }
}

// СТАЛО (чистая бизнес-логика)
export const updateProfile = createSafeAction(
  updateProfileSchema,
  async (data, userId) => {
    return prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
    });
  }
);
```

**📦 Deliverable:** `src/lib/safe-action.ts`

---

### 0.3 🔴 Repository Pattern (День 2, ~3-4 часа)

**Проблема:** Server Actions напрямую вызывают Prisma — невозможно тестировать, нарушен SRP.

**Что делаем:**

```
src/server/
├── repositories/
│   ├── base.repository.ts     # Абстрактный базовый репозиторий
│   ├── user.repository.ts     # CRUD для users
│   └── index.ts
├── services/
│   ├── user.service.ts        # Бизнес-логика
│   └── index.ts
└── actions/
    └── user.actions.ts        # Только Server Actions (тонкий слой)
```

**Цепочка:** `Action → Service → Repository → Prisma`

```typescript
// src/server/repositories/user.repository.ts
export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<User>) {
    return prisma.user.update({ where: { id }, data });
  }
}

// src/server/services/user.service.ts
export class UserService {
  constructor(private repo = new UserRepository()) {}

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User");
    return this.repo.update(userId, data);
  }
}

// src/server/actions/user.actions.ts
const userService = new UserService();

export const updateProfile = createSafeAction(updateProfileSchema, (data, userId) =>
  userService.updateProfile(userId, data)
);
```

**Зачем:** Теперь можно мокать `UserRepository` в тестах, не трогая БД.

**📦 Deliverable:** `src/server/repositories/`, обновлённый `src/server/services/`

---

### 0.4 🟡 Docker Compose для локальной разработки (День 2, ~1-2 часа)

**Проблема:** Каждый разработчик настраивает БД вручную. Нет воспроизводимости.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Email preview (замена Resend для dev)
  mailpit:
    image: axllent/mailpit
    ports:
      - "1025:1025" # SMTP
      - "8025:8025" # Web UI
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: 1

volumes:
  postgres_data:
```

**📦 Deliverable:** `docker-compose.yml`, обновлённый `README.md` с `docker compose up`

---

## Phase 1: Testing Foundation (Неделя 2)

> **Цель:** Выстроить полноценную пирамиду тестирования.
> Nick, это твоя область — здесь максимально детально.

### 1.1 🔴 Пирамида тестирования — документ (День 1, ~2 часа)

**Создаём `docs/testing-strategy.md`:**

```markdown
# Testing Strategy

## Пирамида

          ┌─────────┐
          │  E2E    │  ~10% — критичные user flows
         ┌┴─────────┴┐
         │Integration │  ~20% — API routes, Server Actions
        ┌┴───────────┴┐
        │  Component   │  ~30% — формы, модалки, сложный UI
       ┌┴─────────────┴┐
       │     Unit       │  ~40% — utils, services, validators
       └───────────────┘

## Coverage Targets

- Unit: >80% для services/ и lib/
- Integration: все API routes и Server Actions
- E2E: все критичные user journeys
- A11y: все публичные страницы

## Что мокаем

- Prisma → мок на уровне Repository
- External APIs (Stripe, Resend) → MSW
- Auth → test fixtures

## Что НЕ мокаем

- Zod schemas (тестим реальную валидацию)
- React components (используем Testing Library)
```

**📦 Deliverable:** `docs/testing-strategy.md`

---

### 1.2 🔴 Unit тесты: Vitest setup + примеры (День 1-2, ~3-4 часа)

```bash
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @faker-js/faker
```

**vitest.config.ts:**

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
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/server/**", "src/hooks/**"],
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

**Примеры тестов по слоям:**

```typescript
// tests/unit/lib/errors.test.ts — Unit
describe("AppError", () => {
  it("creates error with correct properties", () => {
    const error = new ValidationError("Invalid email");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});

// tests/unit/services/user.service.test.ts — Service с мок Repository
describe("UserService", () => {
  const mockRepo = {
    findById: vi.fn(),
    update: vi.fn(),
  };
  const service = new UserService(mockRepo as any);

  it("throws NotFoundError for non-existent user", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.updateProfile("xxx", { name: "Test" })).rejects.toThrow(NotFoundError);
  });
});
```

**Структура тестов:**

```
tests/
├── setup.ts                     # Global setup
├── factories/                   # Test data factories
│   ├── user.factory.ts          # faker + типизированные фабрики
│   └── index.ts
├── unit/
│   ├── lib/                     # Utils, errors, validators
│   └── services/                # Business logic
├── integration/
│   ├── actions/                 # Server Actions
│   └── api/                     # API routes
└── helpers/
    ├── db.ts                    # Test DB setup/teardown
    └── auth.ts                  # Auth mocks
```

**📦 Deliverable:** `vitest.config.ts`, `tests/` directory, 10+ тестов-примеров

---

### 1.3 🔴 E2E: Page Object Model + Auth Fixtures (День 2-3, ~4 часа)

**Проблема:** Текущие E2E — два smoke теста. Нужна архитектура.

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, Page } from "@playwright/test";

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Seed test user + login via API (быстрее чем UI)
    await page.request.post("/api/test/auth", {
      data: { email: "test@test.com", role: "USER" },
    });
    await page.goto("/dashboard");
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await page.request.post("/api/test/auth", {
      data: { email: "admin@test.com", role: "ADMIN" },
    });
    await page.goto("/admin");
    await use(page);
  },
});
```

```typescript
// e2e/pages/dashboard.page.ts — Page Object
export class DashboardPage {
  constructor(private page: Page) {}

  readonly heading = this.page.getByRole("heading", { name: /dashboard/i });
  readonly profileLink = this.page.getByRole("link", { name: /profile/i });
  readonly logoutButton = this.page.getByRole("button", { name: /logout/i });

  async navigateToProfile() {
    await this.profileLink.click();
    await this.page.waitForURL(/\/profile/);
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}
```

```typescript
// e2e/flows/profile.spec.ts — User journey
import { test } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/dashboard.page";

test.describe("User Profile Flow", () => {
  test("user can update their name", async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.expectLoaded();
    await dashboard.navigateToProfile();
    // ...
  });
});
```

**Структура E2E:**

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts          # Auth setup
│   ├── db.fixture.ts            # DB seed/cleanup
│   └── test-data.ts             # Shared test data
├── pages/                       # Page Objects
│   ├── home.page.ts
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── profile.page.ts
├── flows/                       # User journeys
│   ├── auth.spec.ts             # Login/Register/Logout
│   ├── profile.spec.ts          # Profile management
│   └── booking.spec.ts          # Core business flow
├── accessibility/               # A11y tests (отдельно)
│   └── pages.spec.ts
└── visual/                      # Visual regression
    └── screenshots.spec.ts
```

**📦 Deliverable:** E2E architecture, auth fixtures, 3+ Page Objects, 5+ flow tests

---

### 1.4 🟡 Test Data Factories (День 3, ~2 часа)

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
    createdAt: faker.date.recent(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildAdmin(overrides?: Partial<User>): User {
  return buildUser({ role: Role.ADMIN, ...overrides });
}

// Для E2E — seed в БД
export async function seedUser(prisma: PrismaClient, overrides?: Partial<User>) {
  return prisma.user.create({ data: buildUser(overrides) });
}
```

**📦 Deliverable:** `tests/factories/`

---

## Phase 2: Security & Reliability (Неделя 3)

> **Цель:** Закрыть security gaps и повысить надёжность.

### 2.1 🔴 CSP с Nonce (День 1, ~3-4 часа)

**Проблема:** `'unsafe-inline' 'unsafe-eval'` — это по сути отключённый CSP.

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data: https:;
    font-src 'self';
    connect-src 'self' https://*.sentry.io https://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);
  return response;
}
```

```typescript
// src/app/layout.tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html>
      <body>
        <Script nonce={nonce} ... />
        {children}
      </body>
    </html>
  );
}
```

**📦 Deliverable:** Обновлённый `middleware.ts`, обновлённый `layout.tsx`, удалённые `unsafe-*`

---

### 2.2 🔴 Rate Limiting на Server Actions (День 1, ~2 часа)

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Разные лимиты для разных действий
export const rateLimiters = {
  // Аутентификация: 5 попыток в 15 минут
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:auth",
  }),
  // API: 100 запросов в минуту
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "rl:api",
  }),
  // Мутации: 20 в минуту
  mutation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "rl:mutation",
  }),
};

export async function checkRateLimit(limiter: keyof typeof rateLimiters, identifier?: string) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "anonymous";
  const key = identifier ?? ip;

  const { success, remaining, reset } = await rateLimiters[limiter].limit(key);

  if (!success) {
    throw new AppError(
      ErrorCode.RATE_LIMITED,
      429,
      `Too many requests. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s`
    );
  }

  return { remaining };
}
```

**Интеграция с createSafeAction:**

```typescript
// Добавляем опцию rateLimit
export const loginAction = createSafeAction(
  loginSchema,
  handler,
  { rateLimit: "auth" } // Автоматический rate limit
);
```

**📦 Deliverable:** `src/lib/rate-limit.ts`, интеграция с safe-action

---

### 2.3 🟡 Dependency Security (День 2, ~1-2 часа)

**GitHub Actions:**

```yaml
# .github/workflows/security.yml
name: Security

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 8 * * 1" # Каждый понедельник

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: step-security/harden-runner@v2

  dependabot:
    # Автоматические PR для обновлений
```

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      development:
        dependency-type: development
      production:
        dependency-type: production
```

**📦 Deliverable:** `.github/workflows/security.yml`, `.github/dependabot.yml`

---

### 2.4 🟡 Authorization middleware (День 2, ~2-3 часа)

```typescript
// src/lib/authorization.ts
type Permission = "user:read" | "user:write" | "admin:all" | "booking:create";

const rolePermissions: Record<Role, Permission[]> = {
  USER: ["user:read", "user:write", "booking:create"],
  ADMIN: ["user:read", "user:write", "admin:all", "booking:create"],
};

export function authorize(requiredPermission: Permission) {
  return async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new UnauthorizedError();

    const permissions = rolePermissions[user.role];
    if (!permissions.includes(requiredPermission)) {
      throw new AppError(ErrorCode.FORBIDDEN, 403, "Insufficient permissions");
    }
  };
}

// Использование в createSafeAction
export const deleteUser = createSafeAction(deleteUserSchema, handler, {
  requireAuth: true,
  permission: "admin:all",
});
```

**📦 Deliverable:** `src/lib/authorization.ts`

---

## Phase 3: DevOps & CI/CD (Неделя 3-4)

> **Цель:** Автоматизация, воспроизводимость, уверенность в деплоях.

### 3.1 🔴 CI/CD Pipeline — полная версия (День 1-2, ~3-4 часа)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Отменяем предыдущие запуски для того же PR
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ─── Параллельные проверки ───
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit

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
          name: coverage-report
          path: coverage/

  # ─── Build (зависит от lint + typecheck) ───
  build:
    needs: [lint, typecheck]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/cache@v4
        with:
          path: .next/cache
          key: next-cache-${{ hashFiles('**/package-lock.json') }}

  # ─── E2E (зависит от build) ───
  e2e:
    needs: [build]
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-report
          path: playwright-report/

  # ─── Security audit ───
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high || true
```

**Package.json scripts:**

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:a11y": "playwright test e2e/accessibility/",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

**📦 Deliverable:** `.github/workflows/ci.yml` (параллельный, с кэшированием)

---

### 3.2 🟡 Branching Strategy (День 2, ~1 час)

**Документ `docs/branching-strategy.md`:**

```markdown
# Branching Strategy: Trunk-Based Development (упрощённый)

## Правила

- `main` — всегда deployable (protected branch)
- Feature branches: `feat/xxx`, `fix/xxx`, `chore/xxx`
- Максимальная жизнь ветки: 2-3 дня
- Squash merge в main
- Автоматический preview deploy на каждый PR (Vercel)

## Branch Protection Rules (GitHub)

- Require PR review (1 approver)
- Require status checks (lint, typecheck, unit-tests, build)
- Require branch up-to-date before merge
- Auto-delete branches after merge

## Release Strategy

- Semantic versioning (semver)
- Changesets для автоматического CHANGELOG
- Tag releases: `v1.0.0`, `v1.1.0`, etc.
```

**📦 Deliverable:** `docs/branching-strategy.md`, настроенные branch protection rules

---

### 3.3 🟡 Health Check & Monitoring (День 2, ~2 часа)

```typescript
// src/app/api/health/route.ts
import { prisma } from "@/lib/db";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Redis (if available)
  try {
    // await redis.ping();
    checks.cache = "ok";
  } catch {
    checks.cache = "error";
  }

  const isHealthy = Object.values(checks).every((v) => v === "ok");

  return Response.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    },
    { status: isHealthy ? 200 : 503 }
  );
}
```

**📦 Deliverable:** `/api/health` endpoint, uptime monitor setup

---

## Phase 4: Frontend & UX Polish (Неделя 4-5)

> **Цель:** Профессиональный UX, accessibility, performance.

### 4.1 🟡 Loading & Error UX (День 1-2, ~4 часа)

**Skeleton screens (не spinners):**

```typescript
// src/components/ui/skeleton-card.tsx
export function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-8 bg-muted rounded w-full" />
    </div>
  );
}
```

**Error boundaries:**

```typescript
// src/components/error-boundary.tsx
"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

**Optimistic updates:**

```typescript
// src/hooks/use-optimistic-action.ts
export function useOptimisticAction<T>(
  action: (data: T) => Promise<ActionResult<T>>,
  options: {
    onOptimistic: (data: T) => void;
    onRollback: () => void;
    onSuccess?: (data: T) => void;
  }
) {
  // ...startTransition + optimistic state
}
```

**📦 Deliverable:** Skeleton components, error boundaries, optimistic hooks

---

### 4.2 🟡 SEO Framework (День 2, ~2-3 часа)

```typescript
// src/lib/metadata.ts
import { type Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

export function createMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${BASE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// src/app/sitemap.ts
export default async function sitemap() {
  const pages = await prisma.page.findMany({ select: { slug: true, updatedAt: true } });
  return [
    { url: BASE_URL, lastModified: new Date() },
    ...pages.map((p) => ({
      url: `${BASE_URL}/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}

// src/app/robots.ts
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/"] },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

**📦 Deliverable:** `src/lib/metadata.ts`, `sitemap.ts`, `robots.ts`, JSON-LD helper

---

### 4.3 🟡 Performance Baseline (День 3, ~2-3 часа)

```bash
npm install -D @next/bundle-analyzer
```

```typescript
// next.config.ts
import withBundleAnalyzer from "@next/bundle-analyzer";

const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
```

**Чеклист:**

```markdown
## Performance Checklist

- [ ] `next/font` для шрифтов (не Google Fonts CDN)
- [ ] `next/image` везде (не <img>)
- [ ] `next/script` с strategy="lazyOnload" для аналитики
- [ ] Dynamic imports для heavy компонентов
- [ ] Bundle analyzer: ни один chunk > 200KB
- [ ] Prisma: select только нужные поля, нет N+1
- [ ] React Server Components по умолчанию
- [ ] Streaming с Suspense для async компонентов
```

**📦 Deliverable:** Bundle analyzer setup, font optimization, `docs/performance-checklist.md`

---

## Phase 5: Documentation & DX (Неделя 5-6)

> **Цель:** Любой разработчик может начать работу за 30 минут.

### 5.1 🟡 Полноценный CLAUDE.md (День 1, ~2 часа)

```markdown
# Project Name

## Stack

Next.js 16 / TypeScript strict / Tailwind 4 / Prisma / Supabase / NextAuth v5

## Architecture

Action → Service → Repository → Prisma
Errors: AppError hierarchy (see src/lib/errors/)
Validation: Zod schemas in src/lib/validations/
Auth: NextAuth v5 with Prisma adapter

## Conventions

- Files: kebab-case (user-profile.tsx)
- Components: PascalCase (UserProfile)
- Variables: camelCase
- DB fields: snake_case via Prisma @@map
- Server Components by default, "use client" only when needed
- Server Actions via createSafeAction wrapper

## Forbidden Patterns

- ❌ Direct Prisma calls in Server Actions (use Repository)
- ❌ `any` type (use `unknown` + type guard)
- ❌ console.log in production code (use structured logger)
- ❌ Inline styles (use Tailwind)
- ❌ Default exports (except pages and layouts)

## Commands

npm run dev # Dev server (Turbopack)
npm run test # Unit tests (Vitest)
npm run test:e2e # E2E tests (Playwright)
npm run test:coverage # Coverage report
npm run db:migrate # Run migrations
npm run db:studio # Prisma Studio
```

**📦 Deliverable:** Полный `CLAUDE.md`

---

### 5.2 🟡 ADR (Architecture Decision Records) (День 1, ~1 час)

```
docs/adr/
├── 001-database-supabase.md
├── 002-auth-nextauth-v5.md
├── 003-email-resend.md
└── template.md
```

```markdown
# ADR-001: Supabase как база данных

## Статус: Принято

## Дата: 2026-02-05

## Контекст

Нужна PostgreSQL база с минимальным DevOps overhead.

## Рассмотренные варианты

1. **Supabase** — managed PostgreSQL, free tier, realtime
2. **PlanetScale** — MySQL, branching (но MySQL, не PostgreSQL)
3. **Neon** — serverless PostgreSQL, branching
4. **Railway** — простой деплой, но дороже

## Решение

Supabase — бесплатный tier достаточен для MVP, PostgreSQL,
хорошая интеграция с Prisma, Row Level Security если понадобится.

## Последствия

- Привязка к Supabase connection pooler
- Миграции через Prisma (не Supabase migrations)
- При масштабировании возможен переход на Neon
```

**📦 Deliverable:** `docs/adr/` с 3-5 решениями

---

### 5.3 🟡 Onboarding README (День 2, ~1-2 часа)

```markdown
# Getting Started

## Prerequisites

- Node.js 22+
- Docker Desktop
- GitHub access

## Setup (5 минут)

git clone ...
cd project
cp .env.example .env # Заполни ключи (см. Vault)
docker compose up -d # БД + Redis + Mailpit
npm install
npm run db:migrate
npm run db:seed
npm run dev # → http://localhost:3000

## Test accounts (после seed)

- user@test.com / password123 (обычный пользователь)
- admin@test.com / password123 (администратор)

## Troubleshooting

- Port 5432 занят? `docker compose down` и попробуй снова
- Prisma ошибки? `npx prisma generate && npx prisma migrate reset`
- Node modules? Удали `node_modules` и `npm install`
```

**📦 Deliverable:** `README.md` с пошаговым onboarding

---

## Phase 6: Observability & Scale (Неделя 6+)

> **Цель:** Production-grade мониторинг и масштабирование.
> Эта фаза актуальна когда есть реальные пользователи.

### 6.1 🟢 Structured Logging (~2-3 часа)

```bash
npm install pino pino-pretty
```

```typescript
// src/lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: {
    env: process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_APP_VERSION,
  },
});

// Использование
logger.info({ userId, action: "profile_update" }, "User updated profile");
logger.error({ error, requestId }, "Payment processing failed");
```

---

### 6.2 🟢 Feature Flags (~2 часа)

```typescript
// src/lib/features.ts (простая реализация через Vercel Edge Config)
import { get } from "@vercel/edge-config";

export async function isFeatureEnabled(flag: string): Promise<boolean> {
  try {
    const value = await get<boolean>(flag);
    return value ?? false;
  } catch {
    return false;
  }
}

// Использование
if (await isFeatureEnabled("new-booking-flow")) {
  // Новый код
} else {
  // Старый код
}
```

---

### 6.3 🟢 Caching Strategy (Next.js 15+) (~3-4 часа)

```typescript
// src/lib/cache.ts
import { unstable_cache } from "next/cache";

// Кэширование запросов с тегами для инвалидации
export const getCachedUser = unstable_cache(
  async (userId: string) => {
    return prisma.user.findUnique({ where: { id: userId } });
  },
  ["user"], // cache key prefix
  { revalidate: 60, tags: ["user"] } // 60s TTL, invalidate by tag
);

// Инвалидация в Server Action
import { revalidateTag } from "next/cache";

export const updateProfile = createSafeAction(schema, async (data, userId) => {
  const result = await userService.updateProfile(userId, data);
  revalidateTag("user"); // Инвалидируем кэш
  return result;
});
```

---

### 6.4 🟢 i18n Setup (~4 часа, если нужно)

```bash
npm install next-intl
```

Структура:

```
src/
├── i18n/
│   ├── request.ts         # Server-side locale detection
│   └── routing.ts         # Locale-aware routing
├── messages/
│   ├── en.json
│   └── ru.json
```

---

## 📊 Визуальная timeline

```
Week 1  ████████████████████████████████████████
        Phase 0: Foundation Hardening
        - Error system, Safe actions, Repository pattern, Docker

Week 2  ████████████████████████████████████████
        Phase 1: Testing Foundation
        - Vitest, E2E architecture, POM, factories

Week 3  ████████████████████████████████████████
        Phase 2: Security          Phase 3: DevOps (start)
        - CSP nonce, Rate limiting  - CI/CD pipeline

Week 4  ████████████████████████████████████████
        Phase 3: DevOps (finish)   Phase 4: Frontend (start)
        - Branching, Health check   - Loading UX, SEO

Week 5  ████████████████████████████████████████
        Phase 4: Frontend (finish) Phase 5: Documentation
        - Performance baseline      - CLAUDE.md, ADR, README

Week 6+ ████████████████████████████████████████
        Phase 6: Observability & Scale (по мере необходимости)
        - Logging, Feature flags, Caching, i18n
```

---

## 🎯 Критерии готовности каждой фазы

| Phase             | Done When                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **0: Foundation** | Все Server Actions через createSafeAction, Repository pattern для основных моделей, Docker compose работает |
| **1: Testing**    | Vitest coverage >70% для services, 5+ E2E flows, POM для всех ключевых страниц                              |
| **2: Security**   | CSP без unsafe-\*, rate limiting на auth + mutations, Dependabot включён                                    |
| **3: DevOps**     | CI проходит <5 мин, параллельные jobs, E2E в CI, branch protection настроен                                 |
| **4: Frontend**   | Lighthouse >90, все страницы с meta, skeletons вместо spinners, error boundaries                            |
| **5: Docs**       | Новый разработчик запускает проект за 30 минут, CLAUDE.md полный, 3+ ADR                                    |
| **6: Scale**      | Structured logs, health endpoint, feature flags, cache strategy документирована                             |

---

_Последнее обновление: Февраль 2026_
_Версия: 1.0_
_Автор: Сгенерировано на основе анализа RECOMMENDATIONS.md_
