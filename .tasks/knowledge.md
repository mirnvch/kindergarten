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
- `DATABASE_URL` — Supabase Transaction Pooler (port 6543)
- `DIRECT_URL` — Supabase Session Pooler (port 5432, для миграций)
- `AUTH_SECRET` — NextAuth secret
- `AUTH_GOOGLE_ID` — Google OAuth
- `AUTH_GOOGLE_SECRET` — Google OAuth

### Optional
- `STRIPE_SECRET_KEY` — Stripe API (Phase 2)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhooks
- `RESEND_API_KEY` — Email service (Phase 1.4)
- `UPSTASH_REDIS_REST_URL` — Upstash Redis URL (rate limiting, caching)
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis token
- `QSTASH_TOKEN` — Upstash QStash token (email queue)
- `QSTASH_CURRENT_SIGNING_KEY` — QStash webhook verification
- `QSTASH_NEXT_SIGNING_KEY` — QStash webhook verification (rotation)

---

## Session Notes

### 2026-01-30 (Session 10)
- **Task #13: Security Enhancements — COMPLETED**
- Implemented 5 security features:
  - **Two-Factor Authentication (2FA)**
    - TOTP-based using otplib v13 (functional API)
    - QR code generation for authenticator apps
    - 10 backup codes with hashed storage
    - Rate limiting (5 verify/min, 3 setup/hour)
    - Encrypted secret storage (AES-256-GCM)
  - **Login Tracking**
    - Records all login attempts (success/failure)
    - Captures IP address, user agent, device info
    - Suspicious activity detection
    - User agent parsing (browser, OS, device type)
  - **Session Management**
    - JWT-based session tracking
    - View active sessions with device info
    - Revoke individual sessions or all others
    - Session activity timestamps
  - **GDPR Data Export**
    - One-click data export request
    - Exports: profile, children, bookings, messages, reviews, etc.
    - Rate limited (1/day)
    - 7-day download expiry
  - **Account Deletion**
    - 14-day grace period before permanent deletion
    - Email confirmation for scheduling/cancellation
    - Password verification required
    - GDPR-compliant anonymization (not hard delete)
- **New Prisma Models:**
  - `TwoFactorAuth`, `TwoFactorBackupCode`
  - `LoginAttempt`, `UserSession`, `DataExportRequest`
  - Extended `User` with deletion fields
- **New Files:**
  - `src/lib/totp.ts` — TOTP utilities
  - `src/lib/user-agent.ts` — UA parsing
  - `src/server/actions/security/` — all security actions
  - `src/components/settings/security/` — all UI components
  - `src/app/(parent)/dashboard/settings/security/page.tsx`
  - `src/app/(auth)/login/verify-2fa/` — 2FA verification page
- **Rate Limit Types Added:**
  - `2fa-verify`: 5/min
  - `2fa-setup`: 3/hour
  - `data-export`: 1/day
  - `account-delete`: 3/hour
- **Auth Flow Updated:**
  - Login now checks for 2FA before completing
  - Redirects to `/login/verify-2fa` if 2FA enabled
  - Records login attempts with reasons
- **Dependencies Added:**
  - `otplib` — TOTP library
  - `qrcode` — QR code generation
- **Следующее:** Task #11 (PWA), #14 (Analytics), or deploy

### 2026-01-30 (Session 9)
- **Authentication Validation — COMPLETED**
  - Google OAuth fully working with custom PrismaAdapter
  - Fixed firstName/lastName mapping from OAuth profile
  - Added email normalization (lowercase, trim) across all auth flows
  - Password requirements: min 8 chars, uppercase, lowercase, digit, special char
  - Disposable email blocking (8 common domains)
  - Name validation (letters, spaces, hyphens, apostrophes)
  - OAuth account linking with specific error messages
  - Error message display in LoginForm from OAuth redirects
  - Error clears when user starts typing
  - callbackUrl support for redirect after login
- **Key files updated:**
  - `src/lib/auth.ts` — CustomPrismaAdapter, signIn callback improvements
  - `src/server/actions/auth.ts` — validation schemas, helpers, error handling
  - `src/app/(auth)/login/page.tsx` — ERROR_MESSAGES map
  - `src/components/forms/login-form.tsx` — error/callbackUrl props
- **Следующее:** Task #11 (PWA), #13 (Security), #14 (Analytics)

### 2026-01-30 (Session 8)
- **Task #12: Verification System — COMPLETED**
  - Prisma models: `VerificationRequest`, `VerificationDocument`
  - Enum: `VerificationStatus` (PENDING, IN_REVIEW, APPROVED, REJECTED)
  - Server actions: `src/server/actions/verification.ts`
    - `submitVerificationRequest` — owner submits request with documents
    - `getVerificationStatus` — check status for a daycare
    - `getVerificationRequests` — admin list
    - `startVerificationReview` — admin starts review
    - `reviewVerificationRequest` — admin approve/reject
    - `revokeVerification` — admin revoke verified status
  - Portal page: `/portal/verification`
    - Status card showing current verification state
    - Verification form with license info and document uploads
    - Benefits section and requirements info
  - Admin pages:
    - `/admin/verifications` — list with filters and stats
    - `/admin/verifications/[id]` — detail view with review form
  - Components:
    - `src/components/portal/verification-status.tsx`
    - `src/components/portal/verification-form.tsx`
    - `src/components/admin/verification-actions.tsx`
    - `src/components/admin/verification-review-form.tsx`
  - Upload API updated to support `type` parameter (messages, verification, profile)
  - Verified badge already exists on daycare cards and detail pages
- **Следующее:** Task #11 (PWA), #13 (Security), #14 (Analytics)

### 2026-01-30 (Session 7)
- **Real-time Messaging TESTED & WORKING**
- Исправлены проблемы:
  - DATABASE_URL в Vercel указывал на старую VPS БД (212.74.231.49)
  - Обновлено на Supabase (aws-1-eu-west-1.pooler.supabase.com)
  - Schema не была синхронизирована с Supabase (MessageThread, Message tables)
  - `npx prisma db push --url="$DIRECT_URL"` для синхронизации
  - Sign out не работал (CSRF token) — исправлено через server action logout
  - Добавлена страница `/portal/messages/[threadId]` для owner
  - Добавлена кнопка "Contact Daycare" на страницу садика
- Тестовые аккаунты:
  - Parent: `test.parent@kindergarten.com` / `Test123!`
  - Owner: `test.owner@kindergarten.com` / `Test123!`
- **Real-time features работают:**
  - Сообщения приходят без перезагрузки
  - Pusher WebSocket подключение
  - Typing indicators
- **Security Audit — COMPLETED:**
  - Добавлен rate limiting для `sendMessage` (30/min) и `startNewThread` (10/min)
  - Добавлена валидация длины сообщения (max 5000 символов)
  - Добавлена валидация длины subject (max 200 символов)
  - Добавлена валидация URL вложений (только trusted storage: Supabase, UploadThing)
  - Добавлена валидация типов файлов (jpeg, png, gif, webp, pdf, txt)
  - Добавлена валидация daycareId формата (CUID)
  - Проверка статуса daycare (APPROVED) при создании thread
  - Создан load test script: `scripts/load-test-messages.ts`
- **Security Constants (messages.ts):**
  - `MAX_MESSAGE_LENGTH = 5000` (5KB)
  - `MAX_SUBJECT_LENGTH = 200`
  - `MAX_ATTACHMENTS = 5`
  - `ALLOWED_ATTACHMENT_TYPES` — whitelist
  - `ALLOWED_URL_PREFIXES` — trusted storage only
- **Deferred Tasks — COMPLETED:**
  - **8.5: Saved Searches**
    - Модель `SavedSearch` в Prisma schema
    - Server actions: `saveSearch`, `getSavedSearches`, `deleteSavedSearch`
    - Компонент `SaveSearchButton` на странице поиска
    - Страница `/dashboard/saved-searches` в parent dashboard
    - Лимит: 10 сохранённых поисков на пользователя
  - **9.2: Recurring Bookings**
    - Enum `RecurrencePattern` (NONE, WEEKLY, BIWEEKLY, MONTHLY)
    - Поля в Booking: `recurrence`, `recurrenceEndDate`, `seriesId`
    - Функция `generateRecurringDates` в booking-utils.ts
    - Компонент `RecurrenceSelector` с preview дат
    - Bulk создание recurring bookings в транзакции
    - `cancelBookingSeries` для отмены всей серии
    - Лимит: max 12 повторений
- **Новые UI компоненты:**
  - `radio-group` (shadcn/ui)
  - `calendar` (shadcn/ui)
- **Следующее:** Task #11-14 (PWA, Verification, Security, Analytics)

### 2026-01-30 (Session 6)
- **Task #8: Search Improvements — COMPLETED**
  - Mapbox GL map view with markers/popups
  - Geolocation search (Haversine formula, radius filter)
  - Rating filter
  - View toggle (grid/map)
  - Search priority by subscription plan
- **Task #9: Booking Enhancements — COMPLETED**
  - RescheduleDialog with date/time picker
  - CancelDialog with cancellation policy display
  - 24-hour cancellation/reschedule policy enforcement
  - Updated BookingCard with new dialogs
- **Task #10: Real-time Communication — COMPLETED**
  - Pusher for WebSocket (server + client libs)
  - Real-time message delivery with hooks
  - Typing indicators (auto-timeout 3s)
  - File attachments (images, documents, 10MB max)
  - Message templates for daycares (5 default templates)
  - Supabase Storage for file uploads
  - New models: MessageAttachment, MessageTemplate
- Deferred: Saved searches (#8.5), Recurring bookings (#9.2)
- **Требуется в Vercel (Pusher):**
  - PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
  - NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER
- **Требуется в Vercel (Supabase Storage):**
  - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- **Следующее:** Task #11-14 (PWA, Verification, Security, Analytics)

### 2026-01-30 (Session 5)
- **Infrastructure Sprint — ALL TASKS COMPLETED**
- **PostgreSQL мигрирован на Supabase**
  - Transaction Pooler (port 6543) для runtime
  - Session Pooler (port 5432) для миграций
  - 26 таблиц создано успешно
  - Для миграций: `npx prisma db push --url="$DIRECT_URL"`
- **Sentry Error Tracking** (#35)
  - Client/server/edge configs
  - Error boundaries (global-error.tsx, error.tsx)
  - Monitoring tunnel at /monitoring
- **Security Headers** (#36)
  - HSTS, X-Frame-Options, X-Content-Type-Options
  - Referrer-Policy, Permissions-Policy
- **CI/CD Pipeline** (#38)
  - GitHub Actions: lint, typecheck, build, test
  - Dependabot for automated updates
- **Testing Setup**
  - Vitest for unit tests (#39) - 21 tests
  - Playwright for E2E tests (#37)
- **Upstash Configured** (#40)
  - Redis: humorous-possum-13342.upstash.io
  - QStash: eu-central-1
- **Staging Environment** (#41)
  - .env.staging.example created
  - Instructions in Quick Reference
- Выявлены и исправлены критические проблемы производительности:
  - #15: Database indexes (8 compound indexes)
  - #16: Connection pool (max: 20, min: 5, timeouts)
  - #17: Rate limiting (Upstash, 6 action types)
  - #18: N+1 fix in bulk messaging (3000 queries → 6)
  - #19: Message pagination (cursor-based, 50/page)
  - #20: Email queue (QStash, 3 retries)
  - #21: Webhook idempotency (WebhookEvent table)
  - #22: Redis caching layer (notifications count)
  - #23: SQL aggregation (groupBy + _avg instead of in-memory)
  - #24: Health endpoint (/api/health)
- Новые файлы:
  - `src/lib/rate-limit.ts`
  - `src/lib/queue.ts`
  - `src/lib/cache.ts`
  - `src/app/api/queue/email/route.ts`
  - `src/app/api/health/route.ts`
- Модели Prisma:
  - `WebhookEvent` (idempotency)
- **Требуется в Vercel:**
  - UPSTASH_REDIS_REST_URL
  - UPSTASH_REDIS_REST_TOKEN
  - QSTASH_TOKEN
  - QSTASH_CURRENT_SIGNING_KEY
  - QSTASH_NEXT_SIGNING_KEY
- **Следующее:** Task #8-14 (features) или deploy

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
vercel --prod          # Production
vercel                 # Preview (auto for PRs)
```

### Staging Environment
```bash
# 1. Create staging branch
git checkout -b staging
git push -u origin staging

# 2. In Vercel Dashboard:
#    - Settings → Git → Production Branch: main
#    - Add staging branch with custom domain: staging.kindergarten-lime.vercel.app

# 3. Set staging environment variables in Vercel:
#    - Use .env.staging.example as reference
#    - Use Stripe TEST keys
#    - Consider separate Supabase project

# 4. Deploy to staging
git checkout staging
git merge main
git push
```
