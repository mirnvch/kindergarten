# Testing Strategy

Стратегия тестирования проекта DocConnect.

---

## Пирамида тестирования

```
              ┌─────────┐
              │   E2E   │  ~10% — критичные user flows
             ┌┴─────────┴┐
             │Integration │  ~20% — Server Actions, API routes
            ┌┴───────────┴┐
            │  Component   │  ~30% — формы, модалки, сложный UI
           ┌┴─────────────┴┐
           │     Unit       │  ~40% — utils, services, validators
           └───────────────┘
```

### Распределение по слоям

| Слой        | %   | Инструмент   | Что тестируем                                |
| ----------- | --- | ------------ | -------------------------------------------- |
| Unit        | 40% | Vitest       | Утилиты, сервисы, валидаторы, error handling |
| Component   | 30% | Vitest + RTL | Формы, модалки, сложные компоненты           |
| Integration | 20% | Vitest       | Server Actions, API routes                   |
| E2E         | 10% | Playwright   | Критичные user flows                         |

---

## Coverage Targets

### Минимальные требования

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
  }
}
```

### Цели по директориям

| Директория                 | Target | Приоритет |
| -------------------------- | ------ | --------- |
| `src/lib/errors/`          | 90%    | Высокий   |
| `src/lib/*.ts`             | 80%    | Высокий   |
| `src/server/services/`     | 80%    | Высокий   |
| `src/server/repositories/` | 70%    | Средний   |
| `src/server/validators/`   | 90%    | Высокий   |
| `src/hooks/`               | 70%    | Средний   |
| `src/components/ui/`       | 50%    | Низкий    |

---

## Что мокаем

### ✅ Мокаем

| Зависимость                    | Как мокаем           | Причина            |
| ------------------------------ | -------------------- | ------------------ |
| Prisma/Database                | Mock Repository      | Изоляция, скорость |
| External APIs (Stripe, Resend) | MSW                  | Предсказуемость    |
| Auth (NextAuth)                | Test fixtures        | Контроль состояния |
| Redis/Cache                    | In-memory mock       | Скорость           |
| Date/Time                      | `vi.setSystemTime()` | Детерминизм        |

### ❌ НЕ мокаем

| Зависимость      | Причина                      |
| ---------------- | ---------------------------- |
| Zod schemas      | Тестируем реальную валидацию |
| Error classes    | Тестируем реальное поведение |
| React components | Используем Testing Library   |
| CSS/Tailwind     | Визуальные тесты отдельно    |

---

## Структура тестов

```
tests/
├── setup.ts                      # Global setup (mocks, matchers)
├── helpers/
│   ├── db.ts                     # Database test utilities
│   ├── auth.ts                   # Auth mock helpers
│   └── msw.ts                    # MSW handlers
├── factories/
│   ├── user.factory.ts           # User test data
│   ├── appointment.factory.ts    # Appointment test data
│   └── index.ts
├── unit/
│   ├── lib/
│   │   ├── errors.test.ts        # Error system tests
│   │   └── safe-action.test.ts   # Safe action tests
│   ├── services/
│   │   └── booking.service.test.ts
│   └── validators/
│       └── common.test.ts
└── integration/
    ├── actions/
    │   └── auth.test.ts
    └── api/
        └── health.test.ts

e2e/
├── fixtures/
│   ├── auth.fixture.ts           # Auth setup
│   └── db.fixture.ts             # DB seed/cleanup
├── pages/                        # Page Objects
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── profile.page.ts
├── flows/                        # User journeys
│   ├── auth.spec.ts
│   ├── booking.spec.ts
│   └── profile.spec.ts
└── accessibility/
    └── pages.spec.ts
```

---

## Naming Conventions

### Файлы тестов

```
# Unit/Integration тесты — рядом с кодом или в tests/
src/lib/errors/app-error.test.ts    # Рядом с кодом
tests/unit/lib/errors.test.ts       # В tests директории

# E2E тесты — всегда в e2e/
e2e/flows/auth.spec.ts
```

### Описание тестов

```typescript
// Формат: describe → it
describe("ErrorHandler", () => {
  describe("toActionResult", () => {
    it("converts AppError to ActionResult", () => {});
    it("converts ZodError to ValidationError", () => {});
    it("handles unknown errors", () => {});
  });
});

// Формат it: should + действие + контекст
it("should return 401 when user is not authenticated", () => {});
it("should create booking when all data is valid", () => {});
```

---

## Паттерны тестирования

### AAA Pattern (Arrange-Act-Assert)

```typescript
it("should cancel booking", async () => {
  // Arrange
  const booking = buildAppointment({ status: "CONFIRMED" });
  mockRepo.findById.mockResolvedValue(booking);

  // Act
  const result = await service.cancel(booking.id, "user-id");

  // Assert
  expect(result.success).toBe(true);
  expect(mockRepo.update).toHaveBeenCalledWith(
    booking.id,
    expect.objectContaining({ status: "CANCELLED" })
  );
});
```

### Test Data Builders

```typescript
// Вместо литералов используем фабрики
const user = buildUser({ role: "ADMIN" });
const appointment = buildAppointment({
  patientId: user.id,
  status: "PENDING",
});
```

### Mock Repository Pattern

```typescript
// Service тестируется с мок репозиторием
const mockUserRepo = {
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const service = new UserService(mockUserRepo as any);
```

---

## E2E Best Practices

### Page Object Model

```typescript
// e2e/pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  // Locators
  readonly emailInput = this.page.getByLabel("Email");
  readonly passwordInput = this.page.getByLabel("Password");
  readonly submitButton = this.page.getByRole("button", { name: /sign in/i });
  readonly errorMessage = this.page.getByRole("alert");

  // Actions
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  // Assertions
  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Auth Fixtures

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base } from "@playwright/test";

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Login via API (faster than UI)
    await page.request.post("/api/test/auth", {
      data: { email: "test@test.com", role: "PATIENT" },
    });
    await page.goto("/dashboard");
    await use(page);
  },
});
```

### Accessibility Tests

```typescript
// e2e/accessibility/pages.spec.ts
import AxeBuilder from "@axe-core/playwright";

test("homepage should have no accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Чеклист перед PR

- [ ] Все новые функции покрыты unit тестами
- [ ] Все новые Server Actions покрыты integration тестами
- [ ] Coverage не упал ниже threshold
- [ ] E2E для критичных изменений в user flow
- [ ] Нет `test.skip` или `test.only` в коммите
- [ ] Тесты проходят локально

---

## Полезные команды

```bash
# Unit тесты
npm run test              # Запуск всех тестов
npm run test:watch        # Watch режим
npm run test:coverage     # С coverage отчётом
npm run test -- path/to/file.test.ts  # Конкретный файл

# E2E тесты
npm run test:e2e          # Все E2E тесты
npm run test:e2e:ui       # С Playwright UI
npm run test:e2e -- --grep "auth"  # По паттерну

# Debug
npm run test -- --reporter=verbose
npx playwright test --debug
```

---

_Последнее обновление: Февраль 2026_
