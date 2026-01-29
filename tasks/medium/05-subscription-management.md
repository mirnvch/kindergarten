# Управление подпиской

## Описание
Реализовать UI для управления подписками детских садов.

## Требования

### Страницы
- `/portal/subscription` - текущий план и управление
- `/pricing` - публичная страница с планами

### Функциональность
- [ ] Отображение текущего плана
- [ ] Upgrade/downgrade плана
- [ ] История платежей
- [ ] Отмена подписки
- [ ] Изменение платёжного метода

### Планы (уже настроены)
| План | Цена | Комиссия |
|------|------|----------|
| FREE | $0 | 5% |
| STARTER | $29/мес | 4% |
| PROFESSIONAL | $79/мес | 3% |
| ENTERPRISE | $199/мес | 2% |

### Компоненты
```typescript
// src/components/portal/SubscriptionCard.tsx
// src/components/portal/PlanComparison.tsx
// src/components/portal/PaymentHistory.tsx
// src/components/pricing/PricingTable.tsx
```

### Server Actions (частично реализованы)
```typescript
// src/server/actions/stripe.ts
createCheckoutSession() // ✅ есть
createCustomerPortalSession() // ✅ есть
getSubscriptionStatus() // ✅ есть
// Добавить:
cancelSubscription()
updateSubscription()
getPaymentHistory()
```

### Stripe Customer Portal
- Использовать встроенный портал Stripe для управления платежами
- Редирект на `createCustomerPortalSession()`

## Критерии готовности
- Владелец видит текущий план
- Владелец может сменить план
- История платежей отображается
- Работает отмена подписки
