# Backend Development Guide

Руководство по разработке бэкенда в проекте DocConnect.

---

## Содержание

1. [Архитектура](#архитектура)
2. [Server Actions](#server-actions)
3. [Services](#services)
4. [Repositories](#repositories)
5. [Валидация](#валидация)
6. [Обработка ошибок](#обработка-ошибок)
7. [База данных](#база-данных)
8. [Чеклист](#чеклист)

---

## Архитектура

### Слои приложения

```
┌─────────────────────────────────────────────┐
│              Server Actions                 │  ← Точка входа (тонкий слой)
│         src/server/actions/*.ts             │
├─────────────────────────────────────────────┤
│                Services                     │  ← Бизнес-логика
│         src/server/services/*.ts            │
├─────────────────────────────────────────────┤
│              Repositories                   │  ← Доступ к данным
│       src/server/repositories/*.ts          │
├─────────────────────────────────────────────┤
│            Prisma Client                    │  ← ORM
│              src/lib/db.ts                  │
└─────────────────────────────────────────────┘
```

### Поток данных

```
Request → Action → Service → Repository → Prisma → DB
                      ↓
              Validation (Zod)
                      ↓
              Error Handling
                      ↓
Response ← Action ← Service ← Repository ← Prisma ← DB
```

### Структура папок

```
src/server/
├── actions/              # Server Actions (entry points)
│   ├── user.actions.ts
│   ├── booking.actions.ts
│   └── index.ts
├── services/             # Business logic
│   ├── user.service.ts
│   ├── booking.service.ts
│   └── index.ts
├── repositories/         # Data access
│   ├── user.repository.ts
│   ├── booking.repository.ts
│   └── index.ts
└── validators/           # Zod schemas
    ├── user.validators.ts
    ├── booking.validators.ts
    └── index.ts
```

---

## Server Actions

### createSafeAction Wrapper

```typescript
// src/lib/safe-action.ts
import { z } from "zod";
import { auth } from "@/lib/auth";
import { AppError, UnauthorizedError } from "@/lib/errors";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

interface ActionOptions {
  requireAuth?: boolean;
  rateLimit?: "auth" | "api" | "mutation";
}

export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (data: TInput, userId: string) => Promise<TOutput>,
  options: ActionOptions = { requireAuth: true }
) {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      // 1. Auth check
      const session = await auth();
      if (options.requireAuth !== false && !session?.user?.id) {
        throw new UnauthorizedError();
      }

      // 2. Validation
      const validated = schema.safeParse(input);
      if (!validated.success) {
        return {
          success: false,
          error: validated.error.errors[0].message,
          code: "VALIDATION_ERROR",
        };
      }

      // 3. Execute handler
      const data = await handler(validated.data, session?.user?.id ?? "");
      return { success: true, data };
    } catch (error) {
      // 4. Error handling
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.code };
      }
      console.error("Unexpected error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };
}
```

### Пример Server Action

```typescript
// src/server/actions/user.actions.ts
"use server";

import { createSafeAction } from "@/lib/safe-action";
import { updateProfileSchema } from "@/server/validators/user.validators";
import { userService } from "@/server/services";

export const updateProfile = createSafeAction(updateProfileSchema, async (data, userId) => {
  return userService.updateProfile(userId, data);
});

export const deleteAccount = createSafeAction(z.object({}), async (_, userId) => {
  return userService.deleteAccount(userId);
});
```

### Использование в компоненте

```typescript
"use client";

import { updateProfile } from "@/server/actions/user.actions";
import { toast } from "sonner";

function ProfileForm() {
  async function onSubmit(data: FormData) {
    const result = await updateProfile({
      name: data.get("name") as string,
    });

    if (result.success) {
      toast.success("Профиль обновлён");
    } else {
      toast.error(result.error);
    }
  }
  // ...
}
```

---

## Services

### Шаблон Service

```typescript
// src/server/services/user.service.ts
import { UserRepository } from "@/server/repositories/user.repository";
import { NotFoundError } from "@/lib/errors";
import { type UpdateProfileInput } from "@/server/validators/user.validators";

export class UserService {
  constructor(private repo = new UserRepository()) {}

  async getById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User");
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    // Бизнес-логика
    const user = await this.getById(userId);

    // Дополнительные проверки
    if (data.email && data.email !== user.email) {
      const existing = await this.repo.findByEmail(data.email);
      if (existing) throw new ValidationError("Email already taken");
    }

    return this.repo.update(userId, data);
  }

  async deleteAccount(userId: string) {
    const user = await this.getById(userId);

    // Cleanup связанных данных
    await this.repo.deleteAllBookings(userId);
    await this.repo.delete(userId);

    return { deleted: true };
  }
}

// Singleton instance
export const userService = new UserService();
```

### Что входит в Service

✅ **Да:**

- Бизнес-правила и валидация
- Оркестрация нескольких repositories
- Транзакции
- Отправка email/notifications
- Логирование бизнес-событий

❌ **Нет:**

- Прямые Prisma вызовы (используй Repository)
- HTTP/Request handling
- UI логика

---

## Repositories

### Шаблон Repository

```typescript
// src/server/repositories/user.repository.ts
import { prisma } from "@/lib/db";
import { type User, type Prisma } from "@prisma/client";

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findMany(options?: {
    take?: number;
    skip?: number;
    where?: Prisma.UserWhereInput;
  }): Promise<User[]> {
    return prisma.user.findMany({
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      where: options?.where,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  // Специфичные методы
  async countByRole(role: Role): Promise<number> {
    return prisma.user.count({ where: { role } });
  }
}
```

### Что входит в Repository

✅ **Да:**

- CRUD операции
- Специфичные запросы к БД
- Выборка с `select` для оптимизации
- Пагинация, сортировка, фильтрация

❌ **Нет:**

- Бизнес-логика
- Валидация
- Error throwing (кроме DB errors)

---

## Валидация

### Zod Schemas

```typescript
// src/server/validators/user.validators.ts
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа").max(50, "Максимум 50 символов").optional(),
  email: z.string().email("Некорректный email").optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{10,14}$/, "Некорректный номер телефона")
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Переиспользуемые схемы
export const emailSchema = z.string().email("Некорректный email");
export const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .regex(/[A-Z]/, "Нужна заглавная буква")
  .regex(/[0-9]/, "Нужна цифра");

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});
```

---

## Обработка ошибок

### Иерархия ошибок

```typescript
// src/lib/errors/app-error.ts
export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, 400, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ErrorCode.NOT_FOUND, 404, `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(ErrorCode.UNAUTHORIZED, 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(ErrorCode.FORBIDDEN, 403, message);
  }
}
```

### Использование

```typescript
// В service
async updateProfile(userId: string, data: UpdateProfileInput) {
  const user = await this.repo.findById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }

  if (user.role !== "ADMIN" && data.role) {
    throw new ForbiddenError("Cannot change role");
  }

  return this.repo.update(userId, data);
}
```

---

## База данных

### Prisma Best Practices

```typescript
// ✅ Используй select для оптимизации
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // Не тянем лишние поля
  },
});

// ✅ Используй include только когда нужны связи
const userWithBookings = await prisma.user.findUnique({
  where: { id },
  include: {
    bookings: {
      take: 5,
      orderBy: { createdAt: "desc" },
    },
  },
});

// ❌ Избегай N+1
// Плохо:
const users = await prisma.user.findMany();
for (const user of users) {
  const bookings = await prisma.booking.findMany({ where: { userId: user.id } });
}

// ✅ Хорошо:
const users = await prisma.user.findMany({
  include: { bookings: true },
});
```

### Транзакции

```typescript
// Для связанных операций
async function createBookingWithPayment(data: BookingInput) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({ data });

    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: data.amount,
        status: "PENDING",
      },
    });

    return { booking, payment };
  });
}
```

---

## Чеклист

### Перед коммитом

- [ ] Server Action использует `createSafeAction`
- [ ] Бизнес-логика в Service, не в Action
- [ ] Prisma вызовы только в Repository
- [ ] Zod schema для валидации входных данных
- [ ] Ошибки через `AppError` классы
- [ ] Нет `any` типов
- [ ] Нет `console.log` (используй logger)

### Security

- [ ] Auth проверка в каждом action
- [ ] Валидация всех входных данных
- [ ] Нет SQL injection (Prisma защищает)
- [ ] Нет secrets в коде
- [ ] Rate limiting для sensitive actions

### Performance

- [ ] `select` вместо полной выборки
- [ ] Пагинация для списков
- [ ] Индексы на часто фильтруемых полях
- [ ] Нет N+1 запросов

---

_См. также:_

- [Testing Guide](./testing.md)
- [Security Guide](./security.md)
- [Architecture Overview](../architecture/overview.md)
