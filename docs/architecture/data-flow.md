# Data Flow

Описание потоков данных в проекте DocConnect.

---

## Содержание

1. [Request/Response Flow](#requestresponse-flow)
2. [Server Actions Flow](#server-actions-flow)
3. [Authentication Flow](#authentication-flow)
4. [Data Fetching Patterns](#data-fetching-patterns)
5. [State Management](#state-management)
6. [Caching Strategy](#caching-strategy)

---

## Request/Response Flow

### Полный цикл запроса

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
│                                                                  │
│   1. User clicks "Save"                                          │
│   ↓                                                              │
│   2. Form calls Server Action                                    │
│      updateProfile({ name: "John" })                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│                      EDGE MIDDLEWARE                             │
│                                                                  │
│   3. Auth check (JWT validation)                                 │
│   4. Rate limiting check                                         │
│   5. CSP headers injection                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│                     SERVER ACTION                                │
│                                                                  │
│   6. createSafeAction wrapper                                    │
│      ├─ Auth verification                                        │
│      ├─ Zod validation                                           │
│      └─ Handler execution                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│                        SERVICE                                   │
│                                                                  │
│   7. Business logic                                              │
│      ├─ Authorization checks                                     │
│      ├─ Data transformation                                      │
│      └─ Cross-cutting concerns                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│                      REPOSITORY                                  │
│                                                                  │
│   8. Prisma query                                                │
│      prisma.user.update({ ... })                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│                       DATABASE                                   │
│                                                                  │
│   9. PostgreSQL executes query                                   │
│   10. Returns updated record                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
                    (Response bubbles up)
                           │
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│                          CLIENT                                  │
│                                                                  │
│   11. Action returns { success: true, data: {...} }              │
│   12. UI updates (toast, redirect, revalidate)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Server Actions Flow

### Структура Server Action

```typescript
// src/server/actions/booking.actions.ts
"use server";

import { createSafeAction } from "@/lib/safe-action";
import { createBookingSchema } from "@/server/validators/booking.validators";
import { bookingService } from "@/server/services";
import { revalidatePath } from "next/cache";

export const createBooking = createSafeAction(createBookingSchema, async (data, userId) => {
  // 1. Service выполняет бизнес-логику
  const booking = await bookingService.create(userId, data);

  // 2. Ревалидация кэша
  revalidatePath("/dashboard/bookings");

  // 3. Возврат результата
  return booking;
});
```

### createSafeAction Wrapper

```typescript
// src/lib/safe-action.ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (data: TInput, userId: string) => Promise<TOutput>,
  options: ActionOptions = { requireAuth: true }
) {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      // 1. AUTH
      const session = await auth();
      if (options.requireAuth && !session?.user?.id) {
        throw new UnauthorizedError();
      }

      // 2. VALIDATION
      const validated = schema.safeParse(input);
      if (!validated.success) {
        return {
          success: false,
          error: validated.error.errors[0].message,
          code: "VALIDATION_ERROR",
        };
      }

      // 3. EXECUTION
      const data = await handler(validated.data, session?.user?.id ?? "");

      // 4. SUCCESS
      return { success: true, data };
    } catch (error) {
      // 5. ERROR HANDLING
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.code };
      }
      console.error("Unexpected error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };
}
```

### Использование в компоненте

```typescript
"use client";

import { useActionState } from "react";
import { createBooking } from "@/server/actions/booking.actions";
import { toast } from "sonner";

export function BookingForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await createBooking({
        serviceId: formData.get("serviceId") as string,
        date: new Date(formData.get("date") as string),
      });

      if (result.success) {
        toast.success("Запись создана!");
      } else {
        toast.error(result.error);
      }

      return result;
    },
    null
  );

  return (
    <form action={formAction}>
      {/* form fields */}
      <button disabled={isPending}>
        {isPending ? "Создание..." : "Записаться"}
      </button>
    </form>
  );
}
```

---

## Authentication Flow

### Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User submits login form                                       │
│    email: "user@example.com"                                     │
│    password: "***"                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│ 2. NextAuth signIn()                                             │
│    - Validates credentials                                       │
│    - Compares password hash (bcrypt)                             │
│    - Creates JWT token                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│ 3. JWT stored in httpOnly cookie                                 │
│    authjs.session-token                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│ 4. Redirect to /dashboard                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Protected Route Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Request to /dashboard                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│ 2. Middleware (Edge)                                             │
│    - Checks JWT cookie                                           │
│    - Validates token signature                                   │
│    - Checks route permissions                                    │
│                                                                  │
│    if (!authenticated) → redirect("/login")                      │
│    if (!authorized) → redirect("/forbidden")                     │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│ 3. Server Component renders                                      │
│    - auth() returns session                                      │
│    - Fetches user-specific data                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────┴──────────────────────────────────────┐
│ 4. Page rendered with user data                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Fetching Patterns

### Server Component (Default)

```typescript
// Данные загружаются на сервере
// Нет waterfall на клиенте
// SEO-friendly

// src/app/doctors/page.tsx
export default async function DoctorsPage() {
  // Выполняется на сервере
  const doctors = await doctorService.getAll();

  return (
    <div>
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} />
      ))}
    </div>
  );
}
```

### Parallel Data Fetching

```typescript
// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  // Параллельная загрузка — быстрее!
  const [user, bookings, stats] = await Promise.all([
    userService.getCurrentUser(),
    bookingService.getRecent(),
    statsService.getDashboard(),
  ]);

  return (
    <div>
      <UserCard user={user} />
      <BookingsList bookings={bookings} />
      <StatsOverview stats={stats} />
    </div>
  );
}
```

### Streaming with Suspense

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Быстрый компонент */}
      <QuickStats />

      {/* Медленный компонент стримится отдельно */}
      <Suspense fallback={<BookingsSkeleton />}>
        <SlowBookingsList />
      </Suspense>
    </div>
  );
}

// Этот компонент может быть медленным
async function SlowBookingsList() {
  const bookings = await bookingService.getWithDetails();
  return <BookingsList bookings={bookings} />;
}
```

### Client-side Fetching (React Query)

```typescript
// Для данных, которые часто обновляются
// Или требуют real-time updates

"use client";

import { useQuery } from "@tanstack/react-query";

export function NotificationBell() {
  const { data: count } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => fetchUnreadCount(),
    refetchInterval: 30000, // Каждые 30 секунд
  });

  return <Badge count={count} />;
}
```

---

## State Management

### State Types

```
┌─────────────────────────────────────────────────────────────────┐
│                      STATE TYPES                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SERVER STATE                    UI STATE                        │
│  (TanStack Query)                (Zustand/useState)              │
│                                                                  │
│  ┌─────────────┐                ┌─────────────┐                 │
│  │ Users       │                │ Sidebar     │                 │
│  │ Bookings    │                │ Modal       │                 │
│  │ Services    │                │ Theme       │                 │
│  │ etc.        │                │ etc.        │                 │
│  └─────────────┘                └─────────────┘                 │
│                                                                  │
│  Cached, Synced                 Local, Ephemeral                │
│  from Server                    Client-only                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Server State (TanStack Query)

```typescript
// src/hooks/use-bookings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => fetch("/api/bookings").then((r) => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
```

### UI State (Zustand)

```typescript
// src/stores/ui-store.ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
```

### Form State (React Hook Form)

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function ProfileForm({ defaultValues }) {
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  // Form state управляется react-hook-form
  // Не нужен useState для каждого поля
}
```

---

## Caching Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      CACHE LAYERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Browser Cache                                          │
│  ├─ Static assets (JS, CSS, images)                              │
│  └─ Cache-Control headers                                        │
│                                                                  │
│  Layer 2: CDN (Vercel Edge)                                      │
│  ├─ Static pages                                                 │
│  └─ ISR (Incremental Static Regeneration)                        │
│                                                                  │
│  Layer 3: React Cache (per-request)                              │
│  ├─ cache() wrapper                                              │
│  └─ Deduplicates within single request                           │
│                                                                  │
│  Layer 4: Data Cache (cross-request)                             │
│  ├─ unstable_cache()                                             │
│  └─ Persistent between requests                                  │
│                                                                  │
│  Layer 5: Client Cache (React Query)                             │
│  ├─ staleTime / gcTime                                           │
│  └─ Optimistic updates                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### React Cache (Request Deduplication)

```typescript
// src/server/services/user.service.ts
import { cache } from "react";

// Кэширует в рамках одного запроса
// Если getUser(1) вызывается 3 раза — запрос к БД только 1
export const getUser = cache(async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
});
```

### Data Cache (Cross-Request)

```typescript
// src/server/services/stats.service.ts
import { unstable_cache } from "next/cache";

// Кэширует между запросами
export const getGlobalStats = unstable_cache(
  async () => {
    return prisma.$queryRaw`
      SELECT COUNT(*) as users,
             SUM(bookings) as total_bookings
      FROM stats
    `;
  },
  ["global-stats"],
  {
    revalidate: 3600, // 1 hour
    tags: ["stats"],
  }
);
```

### Cache Invalidation

```typescript
// src/server/actions/booking.actions.ts
import { revalidatePath, revalidateTag } from "next/cache";

export async function createBooking(data: BookingInput) {
  const booking = await bookingService.create(data);

  // Invalidate specific path
  revalidatePath("/dashboard/bookings");

  // Or invalidate by tag
  revalidateTag("bookings");
  revalidateTag("stats");

  return booking;
}
```

---

_См. также:_

- [Architecture Overview](./overview.md)
- [Backend Guide](../guides/backend.md)
- [Performance Guide](../guides/performance.md)
