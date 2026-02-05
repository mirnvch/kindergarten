# Architecture Overview

Обзор архитектуры проекта DocConnect.

---

## Содержание

1. [Высокоуровневая архитектура](#высокоуровневая-архитектура)
2. [Технологический стек](#технологический-стек)
3. [Структура проекта](#структура-проекта)
4. [Слои приложения](#слои-приложения)
5. [Deployment](#deployment)
6. [Принципы и паттерны](#принципы-и-паттерны)

---

## Высокоуровневая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ React 19     │  │ TanStack     │  │ Zustand      │          │
│   │ Components   │  │ Query        │  │ (UI State)   │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/Server Actions
┌────────────────────────────┴────────────────────────────────────┐
│                      Vercel Edge Network                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ CDN          │  │ Edge         │  │ Middleware   │          │
│   │ (Static)     │  │ Functions    │  │ (Auth)       │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                      Next.js Application                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ App Router   │  │ Server       │  │ API Routes   │          │
│   │ (RSC)        │  │ Actions      │  │ (Webhooks)   │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ Services     │  │ Repositories │  │ Validators   │          │
│   │ (Business)   │  │ (Data)       │  │ (Zod)        │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │ Prisma ORM
┌────────────────────────────┴────────────────────────────────────┐
│                      External Services                           │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ PostgreSQL   │  │ Stripe       │  │ Resend       │          │
│   │ (Supabase)   │  │ (Payments)   │  │ (Email)      │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ Sentry       │  │ Uploadthing  │  │ Upstash      │          │
│   │ (Monitoring) │  │ (Files)      │  │ (Rate Limit) │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Технологический стек

### Core

| Технология | Версия | Назначение                 |
| ---------- | ------ | -------------------------- |
| Next.js    | 15.x   | Full-stack React framework |
| React      | 19.x   | UI library                 |
| TypeScript | 5.x    | Type safety                |
| Prisma     | 6.x    | ORM                        |
| PostgreSQL | 16     | Database                   |

### Frontend

| Технология      | Назначение        |
| --------------- | ----------------- |
| Tailwind CSS 4  | Styling           |
| shadcn/ui       | Component library |
| TanStack Query  | Server state      |
| Zustand         | Client state      |
| React Hook Form | Forms             |
| Zod             | Validation        |

### Backend

| Технология     | Назначение      |
| -------------- | --------------- |
| NextAuth.js v5 | Authentication  |
| Server Actions | API layer       |
| Prisma         | Database access |
| Upstash        | Rate limiting   |

### Infrastructure

| Сервис      | Назначение          |
| ----------- | ------------------- |
| Vercel      | Hosting & Edge      |
| Supabase    | PostgreSQL Database |
| Stripe      | Payments            |
| Resend      | Transactional email |
| Uploadthing | File uploads        |
| Sentry      | Error tracking      |

---

## Структура проекта

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth layout group
│   │   ├── login/
│   │   └── register/
│   ├── (marketing)/          # Public pages
│   │   ├── page.tsx          # Home
│   │   ├── pricing/
│   │   └── about/
│   ├── (dashboard)/          # Protected area
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── settings/
│   ├── api/                  # API routes (webhooks)
│   │   └── webhooks/
│   ├── layout.tsx            # Root layout
│   └── globals.css
│
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── forms/                # Form components
│   ├── layouts/              # Layout components
│   └── [feature]/            # Feature-specific
│
├── lib/                      # Utilities & configs
│   ├── auth.ts               # NextAuth config
│   ├── auth.config.ts        # Edge-compatible config
│   ├── db.ts                 # Prisma client
│   ├── utils.ts              # Utility functions
│   └── errors/               # Error classes
│
├── server/                   # Server-side code
│   ├── actions/              # Server Actions
│   ├── services/             # Business logic
│   ├── repositories/         # Data access
│   └── validators/           # Zod schemas
│
├── hooks/                    # React hooks
├── types/                    # TypeScript types
└── middleware.ts             # Edge middleware

prisma/
├── schema.prisma             # Database schema
└── migrations/               # Migration history

tests/
├── unit/                     # Unit tests
├── integration/              # Integration tests
└── factories/                # Test factories

e2e/
├── fixtures/                 # Playwright fixtures
├── pages/                    # Page objects
└── flows/                    # E2E test flows
```

---

## Слои приложения

### 1. Presentation Layer

```typescript
// Server Components (по умолчанию)
// src/app/users/page.tsx
export default async function UsersPage() {
  const users = await userService.getAll();
  return <UserList users={users} />;
}

// Client Components (интерактивность)
// src/components/users/user-form.tsx
"use client";
export function UserForm() {
  const [state, formAction] = useActionState(createUser, initialState);
  return <form action={formAction}>...</form>;
}
```

### 2. Application Layer (Server Actions)

```typescript
// src/server/actions/user.actions.ts
"use server";

import { createSafeAction } from "@/lib/safe-action";
import { updateProfileSchema } from "@/server/validators/user.validators";
import { userService } from "@/server/services";

export const updateProfile = createSafeAction(updateProfileSchema, async (data, userId) => {
  return userService.updateProfile(userId, data);
});
```

### 3. Domain Layer (Services)

```typescript
// src/server/services/user.service.ts
import { UserRepository } from "@/server/repositories/user.repository";
import { NotFoundError } from "@/lib/errors";

export class UserService {
  constructor(private repo = new UserRepository()) {}

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User");

    // Business logic
    if (data.email && data.email !== user.email) {
      const existing = await this.repo.findByEmail(data.email);
      if (existing) throw new ValidationError("Email already taken");
    }

    return this.repo.update(userId, data);
  }
}
```

### 4. Data Layer (Repositories)

```typescript
// src/server/repositories/user.repository.ts
import { prisma } from "@/lib/db";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}
```

---

## Deployment

### Environments

```
Production:  https://docconnect.ru
Staging:     https://staging.docconnect.ru
Preview:     https://pr-{number}.docconnect.vercel.app
Development: http://localhost:3000
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://docconnect.ru"

# External Services
STRIPE_SECRET_KEY="sk_live_..."
RESEND_API_KEY="re_..."
SENTRY_DSN="https://..."
UPLOADTHING_SECRET="sk_live_..."

# Public
NEXT_PUBLIC_APP_URL="https://docconnect.ru"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

---

## Принципы и паттерны

### Server Components First

```typescript
// По умолчанию — Server Component
// Данные загружаются на сервере, меньше JS на клиенте

// Client Component только когда нужно:
// - useState/useEffect
// - Event handlers
// - Browser APIs
"use client";
```

### Dependency Injection

```typescript
// Services получают зависимости через конструктор
export class BookingService {
  constructor(
    private bookingRepo = new BookingRepository(),
    private userRepo = new UserRepository(),
    private emailService = new EmailService()
  ) {}
}

// Для тестов можно подменить
const service = new BookingService(mockRepo);
```

### Error Boundaries

```typescript
// src/app/dashboard/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Feature Flags (когда нужно)

```typescript
// src/lib/feature-flags.ts
export const features = {
  newBookingFlow: process.env.FEATURE_NEW_BOOKING === "true",
  aiAssistant: process.env.FEATURE_AI_ASSISTANT === "true",
};

// Использование
if (features.newBookingFlow) {
  return <NewBookingFlow />;
}
return <LegacyBookingFlow />;
```

---

_См. также:_

- [Data Flow](./data-flow.md)
- [ADR Template](./adr/template.md)
- [Backend Guide](../guides/backend.md)
