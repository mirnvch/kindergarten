# Environment Variables

Полное описание всех переменных окружения проекта DocConnect.

---

## Содержание

1. [Обзор](#обзор)
2. [Database](#database)
3. [Authentication](#authentication)
4. [Payments](#payments)
5. [Email](#email)
6. [Rate Limiting & Caching](#rate-limiting--caching)
7. [Background Jobs](#background-jobs)
8. [File Uploads](#file-uploads)
9. [Real-time](#real-time)
10. [Maps](#maps)
11. [Error Tracking](#error-tracking)
12. [App Settings](#app-settings)

---

## Обзор

### Минимальный набор для разработки

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="your-secret-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Уровни важности

| Уровень            | Описание                                     |
| ------------------ | -------------------------------------------- |
| 🔴 **Required**    | Приложение не запустится без этих переменных |
| 🟡 **Recommended** | Функционал будет ограничен                   |
| 🟢 **Optional**    | Дополнительные возможности                   |

---

## Database

### Supabase PostgreSQL

| Переменная     | Уровень | Описание                                             |
| -------------- | ------- | ---------------------------------------------------- |
| `DATABASE_URL` | 🔴      | Connection string для Transaction Pooler (port 6543) |
| `DIRECT_URL`   | 🔴      | Connection string для Session Pooler (port 5432)     |

#### Формат

```bash
# Transaction Pooler - для runtime (serverless)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session Pooler - для миграций
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

#### Почему два URL?

- **Transaction Pooler (6543)** — для serverless функций, connection pooling
- **Session Pooler (5432)** — для миграций и Prisma CLI (требует прямое подключение)

#### Где получить

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите проект → Settings → Database
3. Скопируйте Connection strings

---

## Authentication

### NextAuth.js v5

| Переменная           | Уровень | Описание                                       |
| -------------------- | ------- | ---------------------------------------------- |
| `AUTH_SECRET`        | 🔴      | Секрет для шифрования сессий (мин. 32 символа) |
| `NEXTAUTH_URL`       | 🔴      | URL приложения для callbacks                   |
| `AUTH_TRUST_HOST`    | 🟢      | Доверять Host header (для proxies)             |
| `AUTH_COOKIE_DOMAIN` | 🟢      | Домен для cookies (для субдоменов)             |

#### Генерация AUTH_SECRET

```bash
openssl rand -base64 32
# или
npx auth secret
```

### Google OAuth

| Переменная           | Уровень | Описание                   |
| -------------------- | ------- | -------------------------- |
| `AUTH_GOOGLE_ID`     | 🟡      | Google OAuth Client ID     |
| `AUTH_GOOGLE_SECRET` | 🟡      | Google OAuth Client Secret |

#### Настройка Google OAuth

1. Откройте [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create Credentials → OAuth 2.0 Client IDs
3. Application type: Web application
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

---

## Payments

### Stripe

| Переменная                     | Уровень | Описание                        |
| ------------------------------ | ------- | ------------------------------- |
| `STRIPE_SECRET_KEY`            | 🟡      | Серверный ключ API              |
| `STRIPE_PUBLISHABLE_KEY`       | 🟡      | Публичный ключ для клиента      |
| `STRIPE_WEBHOOK_SECRET`        | 🟡      | Секрет для проверки webhooks    |
| `STRIPE_STARTER_PRICE_ID`      | 🟡      | Price ID для Starter плана      |
| `STRIPE_PROFESSIONAL_PRICE_ID` | 🟡      | Price ID для Professional плана |
| `STRIPE_ENTERPRISE_PRICE_ID`   | 🟡      | Price ID для Enterprise плана   |

#### Тестовые ключи vs Production

```bash
# Test keys (sandbox)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Production keys
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

#### Где получить

1. Откройте [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Для webhooks: Developers → Webhooks → Add endpoint

---

## Email

### Resend

| Переменная       | Уровень | Описание          |
| ---------------- | ------- | ----------------- |
| `RESEND_API_KEY` | 🟡      | API ключ Resend   |
| `EMAIL_FROM`     | 🟡      | Email отправителя |

#### Формат EMAIL_FROM

```bash
EMAIL_FROM="DocConnect <noreply@yourdomain.com>"
```

#### Где получить

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. API Keys → Create API Key
3. Domains → Add & verify your domain

---

## Rate Limiting & Caching

### Upstash Redis

| Переменная                 | Уровень | Описание               |
| -------------------------- | ------- | ---------------------- |
| `UPSTASH_REDIS_REST_URL`   | 🟡      | URL для REST API Redis |
| `UPSTASH_REDIS_REST_TOKEN` | 🟡      | Токен аутентификации   |

#### Где получить

1. Создайте базу на [upstash.com](https://upstash.com)
2. Скопируйте REST URL и Token из консоли

#### Что происходит без Redis?

- Rate limiting отключён
- Кэширование отключено
- Приложение работает, но без защиты от DDoS

---

## Background Jobs

### Upstash QStash

| Переменная                   | Уровень | Описание                      |
| ---------------------------- | ------- | ----------------------------- |
| `QSTASH_URL`                 | 🟢      | URL QStash API                |
| `QSTASH_TOKEN`               | 🟢      | Токен аутентификации          |
| `QSTASH_CURRENT_SIGNING_KEY` | 🟢      | Текущий ключ подписи webhooks |
| `QSTASH_NEXT_SIGNING_KEY`    | 🟢      | Следующий ключ (для ротации)  |

#### Используется для

- Отложенная отправка email
- Напоминания о встречах
- Фоновые задачи

---

## File Uploads

### Uploadthing

| Переменная           | Уровень | Описание       |
| -------------------- | ------- | -------------- |
| `UPLOADTHING_SECRET` | 🟡      | Секретный ключ |
| `UPLOADTHING_APP_ID` | 🟡      | ID приложения  |

### Supabase Storage (альтернатива)

| Переменная                  | Уровень | Описание                         |
| --------------------------- | ------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | 🟡      | URL проекта Supabase             |
| `SUPABASE_SERVICE_ROLE_KEY` | 🟡      | Service role key (полный доступ) |

---

## Real-time

### Pusher

| Переменная                   | Уровень | Описание             |
| ---------------------------- | ------- | -------------------- |
| `PUSHER_APP_ID`              | 🟢      | ID приложения        |
| `PUSHER_KEY`                 | 🟢      | Публичный ключ       |
| `PUSHER_SECRET`              | 🟢      | Секретный ключ       |
| `PUSHER_CLUSTER`             | 🟢      | Кластер (eu, us, ap) |
| `NEXT_PUBLIC_PUSHER_KEY`     | 🟢      | Ключ для клиента     |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | 🟢      | Кластер для клиента  |

#### Используется для

- Real-time сообщения
- Typing indicators
- Live updates

---

## Maps

### Mapbox

| Переменная                 | Уровень | Описание     |
| -------------------------- | ------- | ------------ |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | 🟢      | Access token |

#### Где получить

1. Зарегистрируйтесь на [mapbox.com](https://mapbox.com)
2. Account → Access tokens

---

## Error Tracking

### Sentry

| Переменная               | Уровень | Описание                     |
| ------------------------ | ------- | ---------------------------- |
| `SENTRY_DSN`             | 🟢      | Data Source Name (серверный) |
| `NEXT_PUBLIC_SENTRY_DSN` | 🟢      | DSN для клиента              |
| `SENTRY_AUTH_TOKEN`      | 🟢      | Токен для source maps        |
| `SENTRY_ORG`             | 🟢      | Название организации         |
| `SENTRY_PROJECT`         | 🟢      | Название проекта             |

---

## App Settings

| Переменная            | Уровень | Описание                           |
| --------------------- | ------- | ---------------------------------- |
| `NEXT_PUBLIC_APP_URL` | 🔴      | Публичный URL приложения           |
| `NODE_ENV`            | 🟢      | Окружение (development/production) |

---

## Проверка конфигурации

### Скрипт проверки

```bash
# Проверить что все обязательные переменные заданы
node -e "
const required = ['DATABASE_URL', 'DIRECT_URL', 'AUTH_SECRET', 'NEXTAUTH_URL'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}
console.log('✓ All required env vars are set');
"
```

### При деплое на Vercel

1. Откройте Settings → Environment Variables
2. Добавьте все переменные
3. Выберите окружения (Production, Preview, Development)

---

_См. также: [Getting Started](./getting-started.md)_
