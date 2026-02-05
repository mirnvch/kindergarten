# Getting Started

Пошаговое руководство по настройке локального окружения разработки DocConnect.

---

## Содержание

1. [Требования](#требования)
2. [Установка](#установка)
3. [Настройка окружения](#настройка-окружения)
4. [База данных](#база-данных)
5. [Запуск проекта](#запуск-проекта)
6. [Тестовые аккаунты](#тестовые-аккаунты)
7. [Полезные команды](#полезные-команды)
8. [Troubleshooting](#troubleshooting)

---

## Требования

### Обязательные

| Инструмент | Версия | Проверка         |
| ---------- | ------ | ---------------- |
| Node.js    | 20+    | `node --version` |
| npm        | 10+    | `npm --version`  |
| Git        | 2.40+  | `git --version`  |

### Рекомендуемые

| Инструмент         | Назначение                           |
| ------------------ | ------------------------------------ |
| VS Code            | IDE с отличной поддержкой TypeScript |
| Docker             | Для локальной БД (опционально)       |
| Postman / Insomnia | Тестирование API                     |

### VS Code расширения

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-playwright.playwright"
  ]
}
```

---

## Установка

### 1. Клонирование репозитория

```bash
git clone git@github.com:your-org/docconnect.git
cd docconnect
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка Git Hooks

```bash
npm run prepare
```

Это установит Husky hooks для:

- **pre-commit** — lint-staged (ESLint, Prettier)
- **commit-msg** — commitlint (conventional commits)

---

## Настройка окружения

### 1. Создание файла .env

```bash
cp .env.example .env
```

### 2. Минимальная конфигурация для разработки

Для локальной разработки достаточно настроить:

```bash
# .env

# Database (обязательно)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth (обязательно)
AUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Генерация AUTH_SECRET

```bash
openssl rand -base64 32
```

### 4. Полная конфигурация

Для полного функционала нужно настроить:

| Сервис           | Переменные                                    | Где получить                                                                  |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| **Supabase**     | `DATABASE_URL`, `DIRECT_URL`                  | [supabase.com](https://supabase.com)                                          |
| **Google OAuth** | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`        | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |
| **Stripe**       | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | [dashboard.stripe.com](https://dashboard.stripe.com/apikeys)                  |
| **Resend**       | `RESEND_API_KEY`                              | [resend.com](https://resend.com)                                              |
| **Upstash**      | `UPSTASH_REDIS_*`, `QSTASH_*`                 | [upstash.com](https://upstash.com)                                            |
| **Pusher**       | `PUSHER_*`                                    | [pusher.com](https://pusher.com)                                              |
| **Mapbox**       | `NEXT_PUBLIC_MAPBOX_TOKEN`                    | [mapbox.com](https://mapbox.com)                                              |
| **Sentry**       | `SENTRY_DSN`                                  | [sentry.io](https://sentry.io)                                                |

---

## База данных

### Вариант 1: Supabase (рекомендуется)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте connection strings из Settings → Database:
   - **Transaction Pooler** (port 6543) → `DATABASE_URL`
   - **Session Pooler** (port 5432) → `DIRECT_URL`

### Вариант 2: Локальный PostgreSQL

```bash
# Docker
docker run --name docconnect-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=docconnect \
  -p 5432:5432 \
  -d postgres:16-alpine

# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docconnect"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/docconnect"
```

### Применение схемы

```bash
# Создание таблиц
npx prisma db push

# Генерация Prisma Client
npx prisma generate
```

### Заполнение тестовыми данными (опционально)

```bash
npx prisma db seed
```

---

## Запуск проекта

### Development сервер

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

### С Turbopack (быстрее)

```bash
npm run dev -- --turbopack
```

### Production build

```bash
npm run build
npm start
```

---

## Тестовые аккаунты

После запуска `prisma db seed` доступны:

| Email                     | Пароль     | Роль     |
| ------------------------- | ---------- | -------- |
| `admin@docconnect.com`    | `Test123!` | Admin    |
| `patient1@docconnect.com` | `Test123!` | Patient  |
| `patient2@docconnect.com` | `Test123!` | Patient  |
| `provider@docconnect.com` | `Test123!` | Provider |

---

## Полезные команды

### Разработка

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint проверка
npm run lint:fix     # ESLint с автоисправлением
npm run format       # Prettier форматирование
npm run typecheck    # TypeScript проверка
```

### База данных

```bash
npx prisma studio    # Открыть Prisma Studio (GUI для БД)
npx prisma db push   # Применить схему к БД
npx prisma generate  # Сгенерировать Prisma Client
npx prisma db seed   # Заполнить тестовыми данными
npx prisma migrate dev --name <name>  # Создать миграцию
```

### Тестирование

```bash
npm run test         # Unit тесты (Vitest)
npm run test:watch   # Unit тесты в watch режиме
npm run test:e2e     # E2E тесты (Playwright)
npm run test:e2e:ui  # E2E тесты с UI
```

### Git

```bash
git commit -m "feat: add new feature"   # Conventional commit
git commit -m "fix: resolve bug"        # Bug fix
git commit -m "docs: update readme"     # Documentation
```

---

## Docker Setup (Альтернативный способ)

Для воспроизводимого окружения используйте Docker Compose.

### 1. Запуск сервисов

```bash
docker compose up -d
```

Это запустит:

| Сервис   | Порт | Описание                      |
| -------- | ---- | ----------------------------- |
| postgres | 5432 | PostgreSQL 16 база данных     |
| redis    | 6379 | Redis 7 для кэширования       |
| mailpit  | 8025 | Email preview UI (SMTP: 1025) |

### 2. Настройка .env

```bash
cp .env.docker.example .env.local
```

### 3. Применение схемы

```bash
npx prisma db push
npx prisma db seed
```

### 4. Просмотр email

Откройте http://localhost:8025 для просмотра отправленных писем.

### Управление Docker

```bash
docker compose up -d     # Запустить в фоне
docker compose down      # Остановить
docker compose logs -f   # Смотреть логи
docker compose ps        # Статус сервисов

# Сбросить данные
docker compose down -v   # Удалить volumes
docker compose up -d
```

---

## Troubleshooting

### Prisma: "Cannot find database"

```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# Пересоздайте клиент
npx prisma generate
```

### Port 3000 занят

```bash
# Найти процесс
lsof -i :3000

# Убить процесс
kill -9 <PID>

# Или использовать другой порт
npm run dev -- --port 3001
```

### Node modules проблемы

```bash
rm -rf node_modules package-lock.json
npm install
```

### Prisma schema не синхронизирована

```bash
npx prisma db push --force-reset  # ОСТОРОЖНО: удалит все данные
npx prisma db seed
```

### TypeScript ошибки после изменения схемы

```bash
npx prisma generate
# Перезапустите VS Code / TypeScript server
```

### ESLint ошибки при коммите

```bash
# Исправить автоматически
npm run lint:fix

# Или пропустить проверку (не рекомендуется)
git commit --no-verify -m "message"
```

### Husky hooks не работают

```bash
npm run prepare
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

---

## Следующие шаги

После настройки окружения:

1. Изучите [Architecture Overview](../architecture/overview.md)
2. Прочитайте [Backend Guide](../guides/backend.md)
3. Посмотрите [UI Components](../ui/components.md)
4. Ознакомьтесь с [Testing Guide](../guides/testing.md)

---

_Нужна помощь? Создайте issue в репозитории или напишите в Slack._
