# ADR-003: Email сервис — Resend

**Статус:** Accepted

**Дата:** 2026-01-29

**Авторы:** @mrnvch

---

## Контекст

Нужен надёжный email сервис для транзакционных писем.

**Требования:**

- Транзакционные email (подтверждение, напоминания)
- Высокая доставляемость
- Простой API
- Поддержка React Email (HTML шаблоны)
- Бесплатный tier для начала

**Типы писем:**

- Welcome email
- Booking confirmation
- Appointment reminder (24h)
- Password reset
- 2FA codes
- Review response notification

---

## Рассмотренные варианты

### Вариант 1: Resend

**Описание:**
Современный email API от создателей React Email.

**Плюсы:**

- Отличный DX (Developer Experience)
- React Email интеграция
- Щедрый free tier (3,000 emails/month)
- Простой API
- Быстрая доставка
- Email previews

**Минусы:**

- Относительно новый сервис
- Меньше analytics чем у конкурентов

### Вариант 2: SendGrid

**Описание:**
Enterprise email service от Twilio.

**Плюсы:**

- Проверенный временем
- Мощные analytics
- Marketing email поддержка

**Минусы:**

- Сложнее настройка
- Free tier меньше (100 emails/day)
- Менее удобный API

### Вариант 3: Postmark

**Описание:**
Focused on transactional email.

**Плюсы:**

- Отличная доставляемость
- Быстрая доставка
- Message Streams

**Минусы:**

- Дороже ($15/mo minimum)
- Нет free tier
- Только транзакционные

### Вариант 4: AWS SES

**Описание:**
Amazon Simple Email Service.

**Плюсы:**

- Очень дёшево ($0.10/1000)
- Масштабируемость

**Минусы:**

- Сложная настройка
- Sandbox mode изначально
- Меньше features

---

## Решение

Выбран **Resend** потому что:

1. **React Email** — красивые типизированные шаблоны
2. **Free tier** — 3,000 emails/month достаточно для MVP
3. **Простой API** — быстрая интеграция
4. **Отличный DX** — хорошая документация, удобный dashboard

---

## Реализация

### Структура

```
src/lib/
└── email.ts          # Resend client + все шаблоны

src/server/actions/
└── notifications.ts  # Email sending actions
```

### Пример использования

```typescript
// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(user: { email: string; name: string }) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: user.email,
    subject: "Welcome to DocConnect!",
    html: welcomeEmailTemplate(user),
  });
}
```

### Шаблоны писем

| Шаблон                     | Триггер                     |
| -------------------------- | --------------------------- |
| `welcomeEmail`             | Регистрация                 |
| `bookingConfirmationEmail` | Создание записи             |
| `appointmentReminderEmail` | 24h до приёма               |
| `passwordResetEmail`       | Запрос сброса пароля        |
| `twoFactorCodeEmail`       | 2FA код                     |
| `newTrustedDeviceEmail`    | Новое доверенное устройство |
| `reviewResponseEmail`      | Ответ на отзыв              |

---

## Email Queue (QStash)

Для надёжной отправки используем Upstash QStash:

```typescript
// src/lib/queue.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function queueEmail(type: string, data: object) {
  return qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/email`,
    body: { type, data },
    retries: 3,
  });
}
```

---

## Последствия

### Положительные

- Быстрая интеграция
- Красивые HTML письма
- Надёжная доставка
- Удобный мониторинг

### Отрицательные

- При масштабировании потребуется платный план
- Зависимость от third-party

### Риски

- **Риск:** Resend downtime
  - **Митигация:** QStash очередь с retries

- **Риск:** Письма попадают в спам
  - **Митигация:** SPF, DKIM, DMARC настроены

---

## Ссылки

- [Resend Docs](https://resend.com/docs)
- [React Email](https://react.email/)
- [Upstash QStash](https://upstash.com/docs/qstash)
