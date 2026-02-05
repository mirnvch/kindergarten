# Architecture Decision Records (ADR)

Документация архитектурных решений проекта DocConnect.

---

## Что такое ADR?

**ADR** (Architecture Decision Record) — документ, фиксирующий важное архитектурное решение вместе с контекстом и последствиями.

---

## Список ADR

| #                                       | Название                        | Статус   | Дата       |
| --------------------------------------- | ------------------------------- | -------- | ---------- |
| [001](./001-database-supabase.md)       | Database — Supabase PostgreSQL  | Accepted | 2026-01-29 |
| [002](./002-authentication-nextauth.md) | Authentication — NextAuth.js v5 | Accepted | 2026-01-29 |
| [003](./003-email-resend.md)            | Email — Resend                  | Accepted | 2026-01-29 |
| [004](./004-payments-stripe.md)         | Payments — Stripe               | Accepted | 2026-01-29 |
| [005](./005-realtime-pusher.md)         | Real-time — Pusher              | Accepted | 2026-01-30 |

---

## Как создать новый ADR

1. Скопируйте [template.md](./template.md)
2. Создайте файл `{номер}-{название}.md`
3. Заполните все секции
4. Создайте PR для review
5. После принятия обновите статус на "Accepted"

---

## Статусы

| Статус         | Описание                               |
| -------------- | -------------------------------------- |
| **Proposed**   | Решение предложено, ожидает обсуждения |
| **Accepted**   | Решение принято и реализовано          |
| **Deprecated** | Решение устарело, планируется замена   |
| **Superseded** | Заменено другим ADR                    |

---

_См. также: [Architecture Overview](../overview.md)_
