# Deployment Guide - Turborepo на Vercel

## Ключевые принципы (Best Practices)

1. **Zero-config интеграция** - Vercel автоматически распознаёт Turborepo
2. **Один проект = одно приложение** - каждое app = отдельный Vercel project
3. **Root Directory** - указываем путь к app (например `apps/admin`)
4. **Remote Cache** - автоматически включается на Vercel
5. **НЕ нужен vercel.json** - всё настраивается через UI

---

## Пошаговая инструкция

### Шаг 1: Подготовка (уже сделано)

Структура проекта готова:
```
kindergarten/
├── apps/
│   ├── admin/      ← Vercel Project 1
│   ├── portal/     ← Vercel Project 2
│   └── web/        ← Vercel Project 3
├── packages/
│   ├── ui/
│   ├── database/
│   ├── auth/
│   └── utils/
├── turbo.json
└── package.json
```

### Шаг 2: Создание проектов на Vercel

**Для каждого приложения (admin, portal, web):**

1. Иди на https://vercel.com/new
2. Выбери **Import Git Repository** → твой репозиторий `kindergarten`
3. Vercel автоматически определит Turborepo

4. **Настрой проект:**

   | Поле | Значение для Admin | Portal | Web |
   |------|-------------------|--------|-----|
   | Project Name | `kindergarten-admin` | `kindergarten-portal` | `kindergarten-web` |
   | Framework | Next.js (auto) | Next.js (auto) | Next.js (auto) |
   | **Root Directory** | `apps/admin` | `apps/portal` | `apps/web` |
   | Build Command | (оставь пустым - auto) | (auto) | (auto) |
   | Output Directory | (оставь пустым - auto) | (auto) | (auto) |

5. **Включи опцию** (важно для монорепо):
   - Build & Development Settings → **Include source files outside of the Root Directory** ✅

### Шаг 3: Environment Variables

В каждом из 3 проектов добавь переменные:

**Settings → Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Auth
AUTH_SECRET=твой-секретный-ключ
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=xxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-xxx

# Cross-domain cookies (ВАЖНО!)
AUTH_COOKIE_DOMAIN=.kindergarten.com

# Stripe (если используется)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Pusher (real-time)
PUSHER_APP_ID=xxx
PUSHER_SECRET=xxx
NEXT_PUBLIC_PUSHER_KEY=xxx
NEXT_PUBLIC_PUSHER_CLUSTER=eu

# Email
RESEND_API_KEY=re_xxx

# Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Шаг 4: Домены

**Вариант A: Без кастомного домена (для теста)**

После деплоя каждый проект получит URL:
- `kindergarten-admin.vercel.app`
- `kindergarten-portal.vercel.app`
- `kindergarten-web.vercel.app`

⚠️ **Проблема**: Cookies не будут работать между доменами!

**Вариант B: С кастомным доменом (production)**

1. Купи домен (например `kindergarten.com`)

2. В каждом проекте на Vercel:
   - Settings → Domains

   | Проект | Домен |
   |--------|-------|
   | kindergarten-web | `kindergarten.com`, `www.kindergarten.com` |
   | kindergarten-portal | `portal.kindergarten.com` |
   | kindergarten-admin | `admin.kindergarten.com` |

3. Настрой DNS у регистратора:

   | Type | Name | Value |
   |------|------|-------|
   | A | @ | `76.76.21.21` |
   | CNAME | www | `cname.vercel-dns.com` |
   | CNAME | portal | `cname.vercel-dns.com` |
   | CNAME | admin | `cname.vercel-dns.com` |

### Шаг 5: Google OAuth

В [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Выбери OAuth 2.0 Client
2. Добавь в **Authorized redirect URIs**:
   ```
   https://kindergarten.com/api/auth/callback/google
   https://portal.kindergarten.com/api/auth/callback/google
   https://admin.kindergarten.com/api/auth/callback/google
   ```

### Шаг 6: Проверка

1. Деплой произойдёт автоматически после создания проектов
2. Проверь каждый URL
3. Попробуй залогиниться - сессия должна шариться между поддоменами

---

## Альтернатива: Через CLI

```bash
# Войди в Vercel
vercel login

# Линкуй каждое приложение
cd apps/admin && vercel link
cd ../portal && vercel link
cd ../web && vercel link

# После линковки и настройки env vars деплой:
vercel --prod
```

---

## Важные настройки turbo.json

Наш текущий `turbo.json` уже настроен правильно:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local", ".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": [
        "DATABASE_URL",
        "AUTH_SECRET",
        "AUTH_GOOGLE_ID",
        // ... остальные переменные
      ]
    }
  }
}
```

---

## Remote Cache (автоматически)

Vercel автоматически включает Remote Cache для Turborepo:
- Кэш билдов шарится между деплоями
- Ускоряет CI/CD в 10x
- Не требует настройки

Для локальной разработки можно подключить:
```bash
npx turbo link
```

---

## Skip Unchanged Projects

В настройках каждого Vercel проекта включи:

**Settings → Git → Ignored Build Step**

Используй команду:
```bash
npx turbo-ignore
```

Это пропустит деплой если файлы приложения не изменились.

---

## Порты для локальной разработки

```bash
# Запуск всех приложений
npx turbo dev

# Порты:
# - web:    http://localhost:3000
# - portal: http://localhost:3001
# - admin:  http://localhost:3002
```

---

## Чеклист

- [ ] Создан Vercel проект для `apps/admin`
- [ ] Создан Vercel проект для `apps/portal`
- [ ] Создан Vercel проект для `apps/web`
- [ ] Настроены Environment Variables в каждом проекте
- [ ] Куплен кастомный домен
- [ ] Настроены DNS записи
- [ ] Привязаны домены к проектам
- [ ] Обновлены OAuth redirect URLs
- [ ] Проверена авторизация между поддоменами
