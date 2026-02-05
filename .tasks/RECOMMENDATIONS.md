# Project Recommendations & Setup Guide

Комплексное руководство по инструментам, сервисам и настройкам для Next.js проектов.
Основано на опыте разработки DocConnect и Angelina-nextjs.

---

## Содержание

### Часть 0: Организация проекта

0. [Организация проекта с нуля](#0-организация-проекта-с-нуля)
   - [Фаза 1: Инициализация](#фаза-1-инициализация-день-1)
   - [Фаза 2: Инфраструктура](#фаза-2-инфраструктура-день-1-2)
   - [Фаза 3: Core функционал](#фаза-3-core-функционал-неделя-1-2)
   - [Фаза 4: Production](#фаза-4-production-readiness)
   - [Фаза 5: Масштабирование](#фаза-5-масштабирование)

### Часть 1: Инструменты и сервисы

1. [Error Tracking (Sentry)](#1-error-tracking-sentry)
2. [PWA (Progressive Web App)](#2-pwa-progressive-web-app)
3. [Git Hooks (Husky + Commitlint)](#3-git-hooks-husky--commitlint)
4. [Accessibility Testing](#4-accessibility-testing)
5. [Image Optimization](#5-image-optimization)
6. [Authentication (NextAuth v5)](#6-authentication-nextauth-v5)
7. [Database (Supabase + Prisma)](#7-database-supabase--prisma)
8. [Email Service (Resend)](#8-email-service-resend)
9. [File Uploads (Uploadthing / Cloudinary)](#9-file-uploads)
10. [Payments (Stripe)](#10-payments-stripe)
11. [Real-time (Pusher)](#11-real-time-pusher)
12. [Background Jobs (Upstash QStash)](#12-background-jobs-upstash-qstash)
13. [Rate Limiting (Upstash Redis)](#13-rate-limiting-upstash-redis)
14. [Analytics](#14-analytics)
15. [E2E Testing (Playwright)](#15-e2e-testing-playwright)
16. [Security Headers](#16-security-headers)
17. [Environment Variables Template](#17-environment-variables-template)

---

## 0. Организация проекта с нуля

Пошаговое руководство по созданию и организации Next.js проекта от идеи до production.

### Общая структура проекта

```
project-root/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── .husky/
│   ├── pre-commit              # Lint перед коммитом
│   └── commit-msg              # Проверка commit message
├── .tasks/
│   ├── tasks.json              # Задачи проекта
│   ├── knowledge.md            # База знаний
│   └── RECOMMENDATIONS.md      # Это руководство
├── e2e/
│   ├── fixtures/               # Тестовые данные и хелперы
│   ├── flows/                  # Тесты пользовательских сценариев
│   └── home.spec.ts            # Базовые тесты
├── prisma/
│   ├── schema.prisma           # Схема базы данных
│   ├── seed.ts                 # Заполнение тестовыми данными
│   └── migrations/             # Миграции БД
├── public/
│   ├── icons/                  # Иконки для PWA
│   └── manifest.json           # PWA манифест
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Группа: авторизация
│   │   ├── (marketing)/        # Группа: публичные страницы
│   │   ├── (dashboard)/        # Группа: личный кабинет
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Корневой layout
│   │   └── page.tsx            # Главная страница
│   ├── components/
│   │   ├── ui/                 # Базовые UI компоненты (shadcn)
│   │   ├── forms/              # Компоненты форм
│   │   ├── layouts/            # Header, Footer, Sidebar
│   │   └── [feature]/          # Компоненты по фичам
│   ├── lib/
│   │   ├── auth.ts             # NextAuth конфигурация
│   │   ├── auth.config.ts      # Auth config для Edge
│   │   ├── db.ts               # Prisma client
│   │   ├── utils.ts            # Утилиты (cn, formatters)
│   │   └── validations/        # Zod схемы
│   ├── server/
│   │   ├── actions/            # Server Actions
│   │   ├── services/           # Бизнес-логика
│   │   └── validators/         # Серверная валидация
│   ├── hooks/                  # React hooks
│   ├── types/                  # TypeScript типы
│   └── styles/                 # Глобальные стили
├── .env                        # Переменные окружения (НЕ в git!)
├── .env.example                # Шаблон переменных
├── next.config.ts              # Next.js конфигурация
├── tailwind.config.ts          # Tailwind CSS
├── tsconfig.json               # TypeScript
├── playwright.config.ts        # E2E тесты
├── vitest.config.ts            # Unit тесты
├── CLAUDE.md                   # Инструкции для AI
└── package.json
```

---

### Фаза 1: Инициализация (День 1)

#### Шаг 1.1: Создание проекта

```bash
# Создание Next.js проекта
npx create-next-app@latest project-name --typescript --tailwind --eslint --app --src-dir

cd project-name
```

#### Шаг 1.2: Установка базовых зависимостей

```bash
# UI компоненты
npx shadcn@latest init
npx shadcn@latest add button card input form dialog toast

# Иконки
npm install lucide-react

# Утилиты
npm install clsx tailwind-merge date-fns
```

#### Шаг 1.3: Настройка Git

```bash
# Инициализация (если не создан)
git init

# Первый коммит
git add .
git commit -m "feat: initial project setup"

# Подключение к GitHub
git remote add origin git@github.com:username/project-name.git
git push -u origin main
```

#### Шаг 1.4: Создание структуры папок

```bash
# Создание основных директорий
mkdir -p src/components/{ui,forms,layouts}
mkdir -p src/lib/validations
mkdir -p src/server/{actions,services,validators}
mkdir -p src/hooks src/types
mkdir -p e2e/fixtures e2e/flows
mkdir -p .tasks
mkdir -p prisma
mkdir -p public/icons
```

#### Шаг 1.5: Создание CLAUDE.md

Создай файл `CLAUDE.md` в корне проекта с инструкциями:

```markdown
# Project Name - Инструкции для Claude

## Технологический стек

- Next.js 16+ (App Router)
- TypeScript (strict mode)
- Tailwind CSS 4
- Prisma + Supabase
- NextAuth v5

## Правила разработки

- Server Components по умолчанию
- Server Actions для мутаций
- Валидация через Zod
- Компоненты: функциональные, типизированные

## Структура проекта

[Опиши структуру своего проекта]

## Команды

- npm run dev - запуск dev сервера
- npm run build - production сборка
- npm run lint - линтинг
- npm run test - тесты
```

---

### Фаза 2: Инфраструктура (День 1-2)

#### Шаг 2.1: База данных (Supabase + Prisma)

1. **Создай проект в Supabase**
   - https://supabase.com → New Project
   - Скопируй Connection strings

2. **Установи Prisma**

```bash
npm install prisma @prisma/client
npx prisma init
```

3. **Настрой schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

enum Role {
  USER
  ADMIN
}
```

4. **Создай первую миграцию**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

#### Шаг 2.2: Аутентификация (NextAuth v5)

1. **Установи зависимости**

```bash
npm install next-auth@beta @auth/prisma-adapter
```

2. **Создай конфигурацию** (см. раздел 6)

3. **Добавь Prisma модели для Auth**

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

#### Шаг 2.3: Git Hooks (Husky)

```bash
# Установка
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# Инициализация Husky
npx husky init

# Настройка pre-commit
echo "npx lint-staged" > .husky/pre-commit

# Настройка commit-msg
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

Создай `commitlint.config.js` и настрой `lint-staged` в `package.json` (см. раздел 3).

#### Шаг 2.4: Переменные окружения

1. **Создай `.env`** с реальными значениями (НЕ коммить!)
2. **Создай `.env.example`** с пустыми значениями (коммить)

```bash
# Добавь в .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

### Фаза 3: Core функционал (Неделя 1-2)

#### Шаг 3.1: Базовые страницы

Создай минимальный набор страниц:

```
src/app/
├── page.tsx                    # Главная
├── (auth)/
│   ├── login/page.tsx          # Вход
│   └── register/page.tsx       # Регистрация
├── (dashboard)/
│   ├── layout.tsx              # Layout с sidebar
│   └── dashboard/page.tsx      # Дашборд
└── (marketing)/
    ├── about/page.tsx          # О нас
    └── pricing/page.tsx        # Цены
```

#### Шаг 3.2: Компоненты layouts

```
src/components/layouts/
├── header.tsx                  # Шапка сайта
├── footer.tsx                  # Подвал
├── sidebar.tsx                 # Боковое меню (dashboard)
└── mobile-nav.tsx              # Мобильное меню
```

#### Шаг 3.3: Server Actions

Создай паттерн для Server Actions:

```typescript
// src/server/actions/user.ts
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const validated = updateProfileSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validated.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: validated.data.name },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update" };
  }
}
```

#### Шаг 3.4: Базовые E2E тесты

```bash
# Установка Playwright
npm install -D @playwright/test
npx playwright install chromium
```

Создай базовые тесты:

```typescript
// e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Project Name/);
});

test("can navigate to login", async ({ page }) => {
  await page.goto("/");
  await page.click('a[href="/login"]');
  await expect(page).toHaveURL(/\/login/);
});
```

---

### Фаза 4: Production Readiness

#### Шаг 4.1: Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

См. раздел 1 для полной настройки.

#### Шаг 4.2: Security Headers

Добавь в `next.config.ts` (см. раздел 16).

#### Шаг 4.3: PWA Support

```bash
npm install @ducanh2912/next-pwa
```

См. раздел 2 для настройки.

#### Шаг 4.4: CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
```

#### Шаг 4.5: Vercel Deploy

1. Подключи репозиторий к Vercel
2. Добавь переменные окружения в Vercel Dashboard
3. Настрой Production и Preview branches

---

### Фаза 5: Масштабирование

#### Когда добавлять:

| Сервис             | Когда нужен                    |
| ------------------ | ------------------------------ |
| **Pusher**         | Real-time уведомления, чаты    |
| **Upstash Redis**  | Rate limiting, кэширование     |
| **Upstash QStash** | Email очереди, background jobs |
| **Stripe**         | Когда нужны платежи            |
| **Analytics**      | Перед запуском в production    |

#### Чеклист перед production:

- [ ] Все env переменные настроены
- [ ] Sentry работает (проверить тестовой ошибкой)
- [ ] Security headers настроены
- [ ] E2E тесты проходят
- [ ] Lighthouse score > 90
- [ ] Mobile responsive
- [ ] SEO meta tags
- [ ] robots.txt и sitemap.xml
- [ ] 404 и error pages
- [ ] Loading states

---

### Workflow разработки

#### Ежедневный цикл

```
1. Проверь tasks.json → выбери задачу
2. Создай feature branch: git checkout -b feat/task-name
3. Разработка с коммитами (feat:, fix:, etc.)
4. Тесты: npm run test && npm run e2e
5. PR → Code Review → Merge
6. Обнови tasks.json → completed
```

#### Структура коммитов

```
feat: новая функция
fix: исправление бага
docs: документация
style: форматирование
refactor: рефакторинг
test: тесты
chore: настройка, зависимости
```

#### Пример workflow для фичи

```bash
# 1. Начало работы
git checkout main && git pull
git checkout -b feat/user-profile

# 2. Разработка
# ... пишем код ...

# 3. Коммиты
git add src/app/profile
git commit -m "feat: add user profile page"

git add src/server/actions/profile.ts
git commit -m "feat: add updateProfile server action"

# 4. Тесты
npm run test
npm run e2e

# 5. Push и PR
git push -u origin feat/user-profile
# Создай PR на GitHub

# 6. После merge
git checkout main && git pull
git branch -d feat/user-profile
```

---

## 1. Error Tracking (Sentry)

### Что это?

Sentry — сервис мониторинга ошибок в реальном времени. Автоматически ловит ошибки на клиенте и сервере, показывает stack trace с исходным кодом.

### Зачем нужен?

- **Мониторинг ошибок** — видишь все ошибки пользователей в реальном времени
- **Stack trace** — полный путь до ошибки с номерами строк
- **Контекст** — браузер, устройство, действия пользователя до ошибки
- **Session Replay** — запись сессии пользователя (что он делал)
- **Performance** — мониторинг производительности

### Получение ключей (пошагово)

1. **Регистрация**
   - Перейди на https://sentry.io
   - Нажми "Start for Free"
   - Зарегистрируйся через GitHub/Google или email

2. **Создание проекта**
   - После входа нажми "Create Project"
   - Выбери платформу: **Next.js**
   - Назови проект (например: `docconnect-production`)
   - Нажми "Create Project"

3. **Получение DSN**
   - После создания проекта ты увидишь DSN
   - Формат: `https://xxxxx@o12345.ingest.sentry.io/67890`
   - Скопируй этот DSN

4. **Получение Auth Token (для source maps)**
   - Перейди в Settings → Auth Tokens
   - Нажми "Create New Token"
   - Выбери scopes: `project:read`, `project:write`, `org:read`
   - Скопируй токен (показывается только один раз!)

5. **Получение Org и Project**
   - Organization: видно в URL (`sentry.io/organizations/YOUR_ORG/`)
   - Project: имя проекта которое ты создал

### Переменные окружения

```env
# Sentry
SENTRY_DSN="https://xxxxx@o12345.ingest.sentry.io/67890"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@o12345.ingest.sentry.io/67890"
SENTRY_AUTH_TOKEN="sntrys_xxxxx"
SENTRY_ORG="your-organization"
SENTRY_PROJECT="your-project-name"
```

### Установка

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Конфигурация

**sentry.client.config.ts:**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: false,
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**sentry.server.config.ts:**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  environment: process.env.NODE_ENV,
});
```

**next.config.ts (добавить wrapper):**

```typescript
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
```

### Стоимость

- **Free tier**: 5K errors/month, 1 user
- **Team**: $26/month — 50K errors, unlimited users
- **Business**: $80/month — 100K+ errors, advanced features

---

## 2. PWA (Progressive Web App)

### Что это?

PWA позволяет пользователям "установить" веб-приложение на устройство и использовать его офлайн.

### Зачем нужен?

- **Офлайн-режим** — приложение работает без интернета
- **Установка** — можно добавить на домашний экран
- **Push-уведомления** — отправка уведомлений
- **Быстрая загрузка** — кэширование ресурсов

### Установка

```bash
npm install @ducanh2912/next-pwa
```

### Конфигурация

**next.config.ts:**

```typescript
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);
```

**public/manifest.json:**

```json
{
  "name": "DocConnect",
  "short_name": "DocConnect",
  "description": "Find healthcare providers",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Стоимость

- **Бесплатно** — это клиентская технология

---

## 3. Git Hooks (Husky + Commitlint)

### Что это?

- **Husky** — запускает скрипты перед git commit/push
- **lint-staged** — линтит только изменённые файлы
- **commitlint** — проверяет формат commit message

### Зачем нужен?

- **Качество кода** — линтинг перед коммитом
- **Единый стиль** — форматирование при коммите
- **Читаемая история** — стандартные commit messages

### Установка

```bash
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

### Конфигурация

**package.json:**

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

**commitlint.config.js:**

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // Новая функция
        "fix", // Исправление бага
        "docs", // Документация
        "style", // Форматирование (не влияет на код)
        "refactor", // Рефакторинг
        "perf", // Улучшение производительности
        "test", // Тесты
        "build", // Сборка/зависимости
        "ci", // CI/CD
        "chore", // Прочие изменения
        "revert", // Откат
        "wip", // Work in progress
      ],
    ],
  },
};
```

**.husky/pre-commit:**

```bash
npx lint-staged
```

**.husky/commit-msg:**

```bash
npx --no -- commitlint --edit $1
```

### Примеры commit messages

```bash
# Правильно
feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify booking logic

# Неправильно
Fixed stuff
WIP
asdfasdf
```

### Стоимость

- **Бесплатно** — open source инструменты

---

## 4. Accessibility Testing

### Что это?

Автоматическая проверка доступности (a11y) веб-страниц для людей с ограниченными возможностями.

### Зачем нужен?

- **Инклюзивность** — сайт доступен всем пользователям
- **SEO** — поисковики учитывают accessibility
- **Юридические требования** — в некоторых странах обязательно
- **Автоматизация** — находит проблемы до production

### Установка

```bash
npm install -D @axe-core/playwright
```

### Использование в тестах

**e2e/accessibility.spec.ts:**

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("home page should not have a11y violations", async ({ page }) => {
    await page.goto("/");

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("login page should not have a11y violations", async ({ page }) => {
    await page.goto("/login");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

### Стоимость

- **Бесплатно** — open source

---

## 5. Image Optimization

### Что это?

Next.js автоматически оптимизирует изображения. AVIF — современный формат с лучшим сжатием.

### Зачем нужен?

- **Меньший размер** — AVIF на 20-50% меньше WebP
- **Быстрая загрузка** — улучшает Core Web Vitals
- **Автоматическое преобразование** — Next.js делает всё сам

### Конфигурация

**next.config.ts:**

```typescript
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};
```

### Стоимость

- **Бесплатно** — встроено в Next.js

---

## 6. Authentication (NextAuth v5)

### Что это?

NextAuth.js — библиотека для аутентификации в Next.js. Поддерживает OAuth, email/password, magic links.

### Зачем нужен?

- **Готовые провайдеры** — Google, GitHub, Facebook и 50+ других
- **Безопасность** — CSRF protection, JWT, sessions
- **Типизация** — отличная поддержка TypeScript

### Получение ключей (Google OAuth)

1. **Google Cloud Console**
   - Перейди на https://console.cloud.google.com
   - Создай новый проект или выбери существующий

2. **Настройка OAuth consent screen**
   - APIs & Services → OAuth consent screen
   - User Type: External
   - Заполни: App name, User support email, Developer email
   - Добавь scopes: `email`, `profile`, `openid`

3. **Создание OAuth credentials**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000` (dev)
     - `https://yourdomain.com` (prod)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://yourdomain.com/api/auth/callback/google` (prod)

4. **Скопируй ключи**
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

### Переменные окружения

```env
# NextAuth
AUTH_SECRET="your-secret-key-min-32-chars"  # openssl rand -base64 32
AUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID="xxxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxxx"
```

### Конфигурация

**src/lib/auth.ts:**

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
});
```

### Стоимость

- **NextAuth** — бесплатно (open source)
- **Google OAuth** — бесплатно

---

## 7. Database (Supabase + Prisma)

### Что это?

- **Supabase** — облачная PostgreSQL база данных с дополнительными функциями
- **Prisma** — ORM для TypeScript с автогенерацией типов

### Зачем нужен?

- **Бесплатный tier** — 500MB база, 2 проекта
- **Автомасштабирование** — растёт с проектом
- **Real-time** — подписки на изменения
- **Row Level Security** — безопасность на уровне строк

### Получение ключей (Supabase)

1. **Регистрация**
   - Перейди на https://supabase.com
   - Войди через GitHub

2. **Создание проекта**
   - New Project
   - Выбери Organization
   - Введи название и пароль базы данных
   - Выбери регион (ближайший к пользователям)

3. **Получение Connection String**
   - Settings → Database
   - Connection string → URI
   - Скопируй Transaction pooler (port 6543) для runtime
   - Скопируй Session pooler (port 5432) для миграций

### Переменные окружения

```env
# Database
DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

### Конфигурация Prisma

**prisma/schema.prisma:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}

enum Role {
  USER
  ADMIN
}
```

### Команды

```bash
# Генерация Prisma Client
npx prisma generate

# Создание миграции
npx prisma migrate dev --name init

# Применение миграций (production)
npx prisma migrate deploy

# Открыть Prisma Studio
npx prisma studio
```

### Стоимость

- **Supabase Free**: 500MB, 2 projects
- **Supabase Pro**: $25/month — 8GB, daily backups
- **Prisma**: бесплатно (open source)

---

## 8. Email Service (Resend)

### Что это?

Resend — современный сервис отправки email с отличным API и React Email для шаблонов.

### Зачем нужен?

- **Простой API** — отправка email в одну строку
- **React Email** — шаблоны на React компонентах
- **Аналитика** — открытия, клики, bounces
- **Щедрый free tier** — 3000 emails/month

### Получение ключей

1. **Регистрация**
   - Перейди на https://resend.com
   - Зарегистрируйся через GitHub или email

2. **Добавление домена** (опционально, но рекомендуется)
   - Domains → Add Domain
   - Добавь DNS записи (MX, TXT для SPF/DKIM)
   - Дождись верификации

3. **Создание API ключа**
   - API Keys → Create API Key
   - Дай имя (например: `production`)
   - Скопируй ключ (показывается один раз!)

### Переменные окружения

```env
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="DocConnect <noreply@yourdomain.com>"
```

### Использование

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.EMAIL_FROM,
  to: "user@example.com",
  subject: "Welcome to DocConnect!",
  html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
});
```

### С React Email

```bash
npm install @react-email/components
```

```typescript
// emails/welcome.tsx
import { Html, Head, Body, Container, Text } from "@react-email/components";

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Welcome, {name}!</Text>
        </Container>
      </Body>
    </Html>
  );
}

// Отправка
import { render } from "@react-email/render";
import { WelcomeEmail } from "@/emails/welcome";

await resend.emails.send({
  from: process.env.EMAIL_FROM,
  to: "user@example.com",
  subject: "Welcome!",
  html: render(WelcomeEmail({ name: "John" })),
});
```

### Стоимость

- **Free**: 3,000 emails/month, 1 domain
- **Pro**: $20/month — 50,000 emails
- **Enterprise**: custom pricing

---

## 9. File Uploads

### Вариант A: Uploadthing

Простое решение для загрузки файлов в Next.js.

**Получение ключей:**

1. https://uploadthing.com → Sign up
2. Create new app
3. Скопируй UPLOADTHING_SECRET и UPLOADTHING_APP_ID

```env
UPLOADTHING_SECRET="sk_xxxxx"
UPLOADTHING_APP_ID="xxxxx"
```

### Вариант B: Cloudinary

Мощное решение с трансформациями изображений.

**Получение ключей:**

1. https://cloudinary.com → Sign up
2. Dashboard → Account Details
3. Скопируй Cloud Name, API Key, API Secret

```env
CLOUDINARY_CLOUD_NAME="xxxxx"
CLOUDINARY_API_KEY="xxxxx"
CLOUDINARY_API_SECRET="xxxxx"
```

### Стоимость

- **Uploadthing Free**: 2GB storage, 2GB bandwidth
- **Cloudinary Free**: 25GB storage, 25GB bandwidth

---

## 10. Payments (Stripe)

### Что это?

Stripe — платёжная платформа для приёма онлайн-платежей.

### Получение ключей

1. **Регистрация**
   - https://stripe.com → Create account
   - Подтверди email

2. **Test Mode ключи** (для разработки)
   - Dashboard → Developers → API keys
   - Скопируй Publishable key (pk*test*)
   - Скопируй Secret key (sk*test*)

3. **Webhook secret**
   - Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.paid`
   - Скопируй Signing secret (whsec\_)

### Переменные окружения

```env
# Stripe
STRIPE_SECRET_KEY="sk_test_xxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
```

### Стоимость

- 2.9% + $0.30 за транзакцию
- Нет ежемесячной платы

---

## 11. Real-time (Pusher)

### Что это?

Pusher — сервис для real-time функциональности (уведомления, чаты, live updates).

### Получение ключей

1. https://pusher.com → Sign up
2. Create new app → Channels
3. Выбери cluster (eu или us)
4. App Keys → скопируй все ключи

```env
PUSHER_APP_ID="xxxxx"
PUSHER_KEY="xxxxx"
PUSHER_SECRET="xxxxx"
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY="xxxxx"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"
```

### Стоимость

- **Free**: 200K messages/day, 100 connections
- **Startup**: $49/month — 1M messages/day

---

## 12. Background Jobs (Upstash QStash)

### Что это?

QStash — serverless message queue для фоновых задач (отправка email, обработка данных).

### Получение ключей

1. https://upstash.com → Sign up
2. QStash → Create
3. Скопируй Token и URL

```env
QSTASH_TOKEN="xxxxx"
QSTASH_CURRENT_SIGNING_KEY="xxxxx"
QSTASH_NEXT_SIGNING_KEY="xxxxx"
```

### Стоимость

- **Free**: 500 messages/day
- **Pay as you go**: $1 per 100K messages

---

## 13. Rate Limiting (Upstash Redis)

### Что это?

Redis для rate limiting — ограничение количества запросов от пользователя.

### Получение ключей

1. https://upstash.com → Redis → Create Database
2. Выбери регион
3. Скопируй REST URL и Token

```env
UPSTASH_REDIS_REST_URL="https://xxxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxxx"
```

### Стоимость

- **Free**: 10K commands/day
- **Pay as you go**: $0.2 per 100K commands

---

## 14. Analytics

### Google Analytics 4

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### Vercel Analytics (встроено)

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 15. E2E Testing (Playwright)

### Установка

```bash
npm install -D @playwright/test
npx playwright install
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 16. Security Headers

### next.config.ts

```typescript
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self';
      connect-src 'self' https://*.sentry.io;
    `
      .replace(/\s+/g, " ")
      .trim(),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 17. Environment Variables Template

### .env.example (полный шаблон)

```env
# ===========================================
# APP
# ===========================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="DocConnect"

# ===========================================
# DATABASE (Supabase)
# ===========================================
DATABASE_URL="postgresql://postgres:password@localhost:5432/db?pgbouncer=true"
DIRECT_URL="postgresql://postgres:password@localhost:5432/db"

# ===========================================
# AUTHENTICATION (NextAuth v5)
# ===========================================
AUTH_SECRET=""  # openssl rand -base64 32
AUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# ===========================================
# ERROR TRACKING (Sentry)
# ===========================================
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
SENTRY_ORG=""
SENTRY_PROJECT=""

# ===========================================
# EMAIL (Resend)
# ===========================================
RESEND_API_KEY=""
EMAIL_FROM="App <noreply@yourdomain.com>"

# ===========================================
# FILE UPLOADS
# ===========================================
# Uploadthing
UPLOADTHING_SECRET=""
UPLOADTHING_APP_ID=""

# OR Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# ===========================================
# PAYMENTS (Stripe)
# ===========================================
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""

# ===========================================
# REAL-TIME (Pusher) - Optional
# ===========================================
PUSHER_APP_ID=""
PUSHER_KEY=""
PUSHER_SECRET=""
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY=""
NEXT_PUBLIC_PUSHER_CLUSTER="eu"

# ===========================================
# CACHING & QUEUES (Upstash) - Optional
# ===========================================
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
QSTASH_TOKEN=""

# ===========================================
# ANALYTICS - Optional
# ===========================================
NEXT_PUBLIC_GA_MEASUREMENT_ID=""
```

---

## Чеклист для нового проекта

### Минимальный набор (MVP)

- [ ] База данных (Supabase + Prisma)
- [ ] Аутентификация (NextAuth)
- [ ] Sentry (error tracking)
- [ ] Git hooks (Husky)
- [ ] E2E тесты (Playwright)

### Расширенный набор (Production)

- [ ] PWA поддержка
- [ ] Email сервис (Resend)
- [ ] Платежи (Stripe)
- [ ] Аналитика
- [ ] Rate limiting
- [ ] Security headers
- [ ] Accessibility тесты

### Enterprise

- [ ] Real-time (Pusher)
- [ ] Background jobs (QStash)
- [ ] Redis caching
- [ ] Multi-region deployment

---

_Последнее обновление: Февраль 2026_
