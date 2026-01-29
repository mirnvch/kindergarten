# KinderCare Knowledge Base

> Этот файл содержит накопленные знания о проекте. Claude читает его в начале каждой сессии.

---

## Architecture Decisions

### NextAuth v5 + Prisma (Edge Runtime)
**Проблема:** Prisma adapter не работает в Edge Runtime (middleware).
**Решение:** Разделение конфига:
- `auth.config.ts` — Edge-compatible (без adapter, bcrypt)
- `auth.ts` — полный конфиг с adapter
- Middleware импортирует только `auth.config.ts`

### Route Groups Structure
```
src/app/
├── (auth)/       # Login, register — без layout
├── (marketing)/  # Public pages — с header/footer
├── (parent)/     # Parent dashboard — с sidebar
├── (portal)/     # Daycare portal — с sidebar
└── (admin)/      # Admin panel — с sidebar (red theme)
```

### Role-Based Access
| Role | Access |
|------|--------|
| PARENT | /dashboard/* |
| DAYCARE_OWNER | /portal/* |
| DAYCARE_STAFF | /portal/* (limited) |
| ADMIN | /admin/* |

---

## Patterns Used

### Server Actions
- Все мутации через Server Actions в `src/server/actions/`
- Валидация с Zod
- Возвращают `{ success: boolean, error?: string, data?: T }`

### Components Structure
```
src/components/
├── ui/           # shadcn/ui components
├── admin/        # Admin-specific components
├── portal/       # Portal-specific components
├── parent/       # Parent dashboard components
└── [feature]/    # Feature-specific (booking, search, etc.)
```

### Database Queries
- Всегда использовать `select` для оптимизации
- Prisma schema: camelCase в коде, snake_case в БД через `@@map`
- Транзакции для связанных операций

---

## Known Issues & Solutions

### Issue: Session не обновляется после изменения роли
**Решение:** Использовать `update` callback в auth config для синхронизации session с JWT.

### Issue: Hydration mismatch в sidebar
**Решение:** Компоненты с `usePathname()` должны быть `"use client"`.

### Issue: Prisma в Vercel Edge Functions
**Решение:** Не импортировать Prisma в middleware. Использовать JWT strategy вместо database sessions.

---

## API Endpoints

### Webhooks
- `/api/webhooks/stripe` — Stripe events (planned)

### Auth
- `/api/auth/*` — NextAuth.js handlers

---

## Environment Variables

### Required
- `DATABASE_URL` — PostgreSQL connection
- `AUTH_SECRET` — NextAuth secret
- `AUTH_GOOGLE_ID` — Google OAuth
- `AUTH_GOOGLE_SECRET` — Google OAuth

### Optional
- `STRIPE_SECRET_KEY` — Stripe API (Phase 2)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhooks
- `RESEND_API_KEY` — Email service (Phase 1.4)

---

## Session Notes

### 2026-01-29 (Session 4)
- **Task #7: Waitlist System — COMPLETED**
- Завершены все 4 подзадачи:
  - 7.1: Waitlist join button на заполненных садах
  - 7.2: Portal waitlist management page
  - 7.3: Auto-notification при освобождении места
  - 7.4: Waitlist position в parent dashboard
- Создан `src/server/actions/waitlist.ts`
- Создан `src/components/waitlist/` (waitlist-form, waitlist-entries-list)
- Создан `src/components/portal/waitlist-table.tsx`
- Создана страница `/portal/waitlist`
- Добавлен email template `waitlistSpotAvailableEmail`
- Добавлен тестовый садик "OC Toddler School" (Irvine, CA)
- Исправлен next.config.ts для внешних изображений (Unsplash)
- **Следующее:** Task #8-14

### 2026-01-29 (Session 3)
- **Task #2: Enhance Daycare Portal — COMPLETED**
- Завершены все 7 подзадач:
  - 2.1: Profile editor (basic info, contact, location, capacity)
  - 2.2: Photos manager (add, delete, set primary)
  - 2.3: Programs management (CRUD with age ranges, pricing)
  - 2.4: Schedule management (hours per day, open/closed)
  - 2.5: Pricing management (monthly, weekly, daily, registration fee)
  - 2.6: Amenities selection (checkbox list by category)
  - 2.7: Staff management (add/remove, roles, activate/deactivate)
  - 2.8: Analytics dashboard (bookings, enrollments, revenue, conversion)
- Создано 7 server action файлов в `src/server/actions/portal/`
- Создано 7 компонентов в `src/components/portal/`
- Добавлена страница `/portal/analytics`

- **Task #3: Reviews System — COMPLETED**
- Завершены все 5 подзадач:
  - 3.1: Review submission form (dialog с rating, title, content, detailed ratings)
  - 3.2: Reviews display (ReviewsSection компонент с проверкой canReview)
  - 3.3: Daycare response (страница /portal/reviews с формой ответа)
  - 3.4: Rating aggregation (уже было в getDaycareBySlug)
  - 3.5: Admin moderation (уже было в /admin/reviews)
- Создан `src/server/actions/reviews.ts`
- Создано `src/components/reviews/` (review-form, reviews-section)

- **Task #4: Notifications System — COMPLETED**
- Завершены все 6 подзадач:
  - 4.1: Resend email service setup (lazy initialization для build)
  - 4.2: Email templates (booking confirmation, reminder, message, welcome, review response)
  - 4.3: Booking confirmation emails
  - 4.4: Reminder emails (cron job для 24h до тура)
  - 4.5: In-app notifications (NotificationBell компонент с dropdown)
  - 4.6: Notification preferences (switch toggles в settings)
- Создан `src/lib/email.ts` с HTML email templates
- Создан `src/server/actions/notifications.ts`
- Создан `src/components/notifications/` (notification-bell, notification-preferences)
- Добавлен `vercel.json` с cron для `/api/cron/reminders`
- **Task #5: Stripe Integration — COMPLETED**
- Backend уже был реализован:
  - `src/lib/stripe.ts` - client + plans
  - `src/server/actions/stripe.ts` - checkout, portal, connect
  - `src/app/api/webhooks/stripe/route.ts` - webhook handlers
  - `src/config/pricing.ts` - pricing plans config
- Добавлен UI:
  - `/portal/billing` - subscription management, upgrade, billing history
  - `/portal/payments` - Stripe Connect для получения платежей
  - Обновлена `/pricing` страница с PRICING_PLANS config
- Компоненты: `src/components/billing/` (plan-card, billing-history, buttons)
- **Task #6: Premium Features — COMPLETED**
- Завершены все 4 подзадачи:
  - 6.1: Featured badge + premium badges (Enterprise crown, Pro sparkles)
  - 6.2: Subscription-based search priority (ENTERPRISE > PRO > STARTER > FREE)
  - 6.3: Advanced analytics (weekly trends, traffic sources, peak hours) + upgrade prompt
  - 6.4: Bulk messaging для PRO/ENTERPRISE (send to all/enrolled/waitlisted/toured)
- Создан `src/server/actions/bulk-messaging.ts`
- Создан `src/components/portal/bulk-message-dialog.tsx`
- Создана страница `/portal/messages`
- Обновлён `daycare-card.tsx` с premium badges
- Обновлён `analytics/page.tsx` с premium analytics
- **Следующее:** Task #7 — Waitlist System

### 2026-01-29 (Session 2)
- **Task #1: Admin Panel — COMPLETED**
- Завершены все 6 подзадач:
  - 1.4: Daycare moderation (approve/reject/suspend/reactivate/delete/featured)
  - 1.5: Content moderation (reviews + messages pages)
  - 1.6: Platform settings (site config, feature flags, pricing, moderation)
- Настроена синхронизация встроенных /todos с .tasks/tasks.json
- Обновлён CLAUDE.md с новым workflow для задач

### 2026-01-29 (Session 1)
- Создана система задач в `.tasks/`
- Начата работа над Admin Panel (#1)
- Готово: layout, sidebar, dashboard, user management (3/6 подзадач)

---

## Quick Reference

### Создать новую страницу в admin
```bash
# 1. Создать page.tsx
touch src/app/(admin)/admin/[feature]/page.tsx

# 2. Добавить в navigation (admin-sidebar.tsx)
# 3. Создать server actions если нужно
```

### Проверить типы
```bash
npm run build  # TypeScript check
```

### Deploy
```bash
vercel --prod
```
