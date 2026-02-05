# ADR-001: Выбор базы данных — Supabase PostgreSQL

**Статус:** Accepted

**Дата:** 2026-01-29

**Авторы:** @mrnvch

---

## Контекст

Нужна надёжная база данных для production приложения DocConnect.

**Требования:**

- PostgreSQL (Prisma ORM)
- Managed service (минимум DevOps)
- Connection pooling для serverless
- Бесплатный tier для MVP
- Масштабирование при росте

**Ограничения:**

- Serverless архитектура (Vercel)
- Нужен connection pooling
- Бюджет на MVP: $0

---

## Рассмотренные варианты

### Вариант 1: Supabase

**Описание:**
Managed PostgreSQL с дополнительными сервисами (Auth, Storage, Realtime).

**Плюсы:**

- Щедрый free tier (500MB, 2 CPU cores)
- Встроенный connection pooler (PgBouncer)
- PostgreSQL 15/16
- Дополнительные сервисы (Storage, Realtime)
- Отличная документация
- Row Level Security (если понадобится)

**Минусы:**

- Vendor lock-in на дополнительные сервисы
- Регион ограничен (aws-eu-west-1 и др.)
- Платный tier дорогой ($25/mo)

### Вариант 2: Neon

**Описание:**
Serverless PostgreSQL с branching.

**Плюсы:**

- Serverless (автомасштабирование)
- Database branching (удобно для preview)
- Щедрый free tier

**Минусы:**

- Относительно новый сервис
- Меньше дополнительных сервисов
- Cold start при простое

### Вариант 3: Railway

**Описание:**
PaaS с простым деплоем PostgreSQL.

**Плюсы:**

- Простой UI
- Быстрый старт
- Хорошая интеграция с GitHub

**Минусы:**

- Дороже ($5/mo minimum)
- Нет встроенного connection pooling
- Меньше функций

### Вариант 4: Self-hosted (VPS)

**Описание:**
PostgreSQL на собственном сервере.

**Плюсы:**

- Полный контроль
- Дешевле при масштабировании
- Нет vendor lock-in

**Минусы:**

- Требует DevOps навыков
- Backups, мониторинг вручную
- Нет connection pooling из коробки

---

## Решение

Выбран **Supabase** потому что:

1. **Free tier** достаточен для MVP и начального роста
2. **Connection pooling** из коробки (критично для Vercel)
3. **PostgreSQL 16** — полноценная СУБД без ограничений
4. **Дополнительные сервисы** (Storage для файлов, Realtime если понадобится)
5. **Отличная документация** и активное сообщество

---

## Конфигурация

```bash
# Transaction Pooler (port 6543) — для serverless runtime
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session Pooler (port 5432) — для миграций
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## Последствия

### Положительные

- Быстрый старт без DevOps
- Надёжный connection pooling
- Возможность использовать Storage для файлов
- Масштабирование до $25/mo при необходимости

### Отрицательные

- При большом трафике потребуется Pro план
- Некоторый vendor lock-in

### Риски

- **Риск:** Supabase поднимет цены
  - **Митигация:** Миграция на Neon или self-hosted возможна (стандартный PostgreSQL)

- **Риск:** Outage Supabase
  - **Митигация:** Мониторинг через Sentry, backups включены

---

## Ссылки

- [Supabase Docs](https://supabase.com/docs)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
