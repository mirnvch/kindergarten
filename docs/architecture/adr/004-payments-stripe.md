# ADR-004: Платежи — Stripe

**Статус:** Accepted

**Дата:** 2026-01-29

**Авторы:** @mrnvch

---

## Контекст

Нужна система платежей для монетизации платформы.

**Требования:**

- Subscription billing (планы для провайдеров)
- Разовые платежи (опционально)
- Webhooks для обработки событий
- Billing portal для клиентов
- Stripe Connect для payouts провайдерам

**Планы подписки:**

- Free — базовый функционал
- Starter — расширенные возможности
- Professional — премиум функции
- Enterprise — всё + приоритетная поддержка

---

## Рассмотренные варианты

### Вариант 1: Stripe

**Описание:**
Лидер рынка платёжных сервисов.

**Плюсы:**

- Отличная документация
- Stripe Connect для маркетплейсов
- Billing portal из коробки
- Webhooks
- Sandbox для тестирования
- Глобальное покрытие

**Минусы:**

- Комиссия 2.9% + $0.30
- Сложнее для простых use cases

### Вариант 2: Paddle

**Описание:**
Merchant of Record — они обрабатывают налоги.

**Плюсы:**

- Налоги обрабатываются автоматически
- Проще compliance
- Хорошо для SaaS

**Минусы:**

- Выше комиссия (5%+)
- Меньше контроля
- Только для digital goods

### Вариант 3: LemonSqueezy

**Описание:**
Простой MoR для digital products.

**Плюсы:**

- Простая интеграция
- Налоги включены
- Хорош для indie developers

**Минусы:**

- Меньше features
- Нет Connect для маркетплейсов
- Ограниченные регионы

---

## Решение

Выбран **Stripe** потому что:

1. **Stripe Connect** — для выплат провайдерам
2. **Billing Portal** — клиенты сами управляют подпиской
3. **Webhooks** — надёжная обработка событий
4. **Отличный DX** — лучшая документация в индустрии
5. **Масштабирование** — от MVP до enterprise

---

## Архитектура

### Структура

```
src/lib/
└── stripe.ts           # Stripe client + config

src/server/actions/
└── stripe.ts           # Stripe actions

src/app/api/webhooks/
└── stripe/route.ts     # Webhook handler

src/config/
└── pricing.ts          # Планы и цены
```

### Планы подписки

```typescript
// src/config/pricing.ts
export const PRICING_PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    features: ["5 appointments/month", "Basic profile"],
  },
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 29,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: ["50 appointments/month", "Analytics"],
  },
  PROFESSIONAL: {
    id: "professional",
    name: "Professional",
    price: 79,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: ["Unlimited appointments", "Priority support"],
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: ["All features", "Custom integrations"],
  },
};
```

### Webhook Events

| Event                           | Действие                  |
| ------------------------------- | ------------------------- |
| `checkout.session.completed`    | Создать/обновить подписку |
| `customer.subscription.updated` | Обновить план             |
| `customer.subscription.deleted` | Отменить подписку         |
| `invoice.paid`                  | Записать платёж           |
| `invoice.payment_failed`        | Уведомить пользователя    |

### Stripe Connect Flow

```
1. Провайдер регистрируется
   ↓
2. Создаём Stripe Connected Account
   ↓
3. Провайдер завершает onboarding
   ↓
4. При бронировании — платёж через Connect
   ↓
5. Автоматический payout на счёт провайдера
```

---

## Безопасность

### Webhook Signature Verification

```typescript
// src/app/api/webhooks/stripe/route.ts
const sig = headers().get("stripe-signature")!;
const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
```

### Idempotency

```typescript
// Проверка на дублирование
const existing = await db.webhookEvent.findUnique({
  where: { eventId: event.id },
});
if (existing) return; // Already processed
```

---

## Последствия

### Положительные

- Стандартное решение
- Минимум кода для billing
- Connect для маркетплейса

### Отрицательные

- Комиссия на каждую транзакцию
- Сложность Connect setup

### Риски

- **Риск:** Stripe блокирует аккаунт
  - **Митигация:** Соблюдение ToS, мониторинг disputes

- **Риск:** Webhook failures
  - **Митигация:** Idempotency, retry logic

---

## Ссылки

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
