# Performance Guide

Руководство по оптимизации производительности в проекте DocConnect.

---

## Содержание

1. [Core Web Vitals](#core-web-vitals)
2. [Next.js Optimizations](#nextjs-optimizations)
3. [Images & Media](#images--media)
4. [Database Performance](#database-performance)
5. [Caching Strategies](#caching-strategies)
6. [Bundle Optimization](#bundle-optimization)
7. [Monitoring](#monitoring)
8. [Чеклист](#чеклист)

---

## Core Web Vitals

### Целевые метрики

| Метрика  | Описание                  | Target  |
| -------- | ------------------------- | ------- |
| **LCP**  | Largest Contentful Paint  | < 2.5s  |
| **INP**  | Interaction to Next Paint | < 200ms |
| **CLS**  | Cumulative Layout Shift   | < 0.1   |
| **FCP**  | First Contentful Paint    | < 1.8s  |
| **TTFB** | Time to First Byte        | < 800ms |

### Измерение

```typescript
// src/lib/vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric: { name: string; value: number }) {
  // Отправка в Google Analytics 4
  gtag("event", metric.name, {
    event_category: "Web Vitals",
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    event_label: metric.id,
    non_interaction: true,
  });
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

---

## Next.js Optimizations

### Server Components (Default)

```typescript
// ✅ Server Component — по умолчанию, меньше JS на клиенте
export default async function UserList() {
  const users = await prisma.user.findMany();
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// ⚠️ Client Component — только когда нужны hooks/interactivity
"use client";
export function SearchInput() {
  const [query, setQuery] = useState("");
  // ...
}
```

### Streaming & Suspense

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { UserStats } from "./user-stats";
import { RecentBookings } from "./recent-bookings";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Стримится независимо */}
      <Suspense fallback={<StatsSkeleton />}>
        <UserStats />
      </Suspense>

      <Suspense fallback={<BookingsSkeleton />}>
        <RecentBookings />
      </Suspense>
    </div>
  );
}
```

### Parallel Data Fetching

```typescript
// ✅ Параллельная загрузка
async function Dashboard() {
  const [user, bookings, stats] = await Promise.all([getUser(), getBookings(), getStats()]);
  // ...
}

// ❌ Последовательная загрузка (медленнее)
async function Dashboard() {
  const user = await getUser();
  const bookings = await getBookings();
  const stats = await getStats();
  // ...
}
```

### Dynamic Imports

```typescript
import dynamic from "next/dynamic";

// Ленивая загрузка тяжёлых компонентов
const HeavyChart = dynamic(() => import("@/components/heavy-chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Только на клиенте
});

// Ленивая загрузка модальных окон
const DeleteModal = dynamic(() => import("@/components/delete-modal"));
```

### Route Segment Config

```typescript
// src/app/blog/page.tsx
// Статическая генерация с ревалидацией каждые 60 секунд
export const revalidate = 60;

// Или полностью статический
export const dynamic = "force-static";

// Или полностью динамический
export const dynamic = "force-dynamic";
```

---

## Images & Media

### Next.js Image

```typescript
import Image from "next/image";

// ✅ Оптимизированное изображение
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // Для LCP изображений
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// ✅ Responsive изображение
<Image
  src="/photo.jpg"
  alt="Photo"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

### Image Formats

```typescript
// next.config.ts
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"], // AVIF — лучшее сжатие
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

### Lazy Loading

```typescript
// Images below fold загружаются лениво по умолчанию
<Image src="/photo.jpg" alt="..." loading="lazy" />

// Для hero/LCP изображений — без lazy loading
<Image src="/hero.jpg" alt="..." priority />
```

---

## Database Performance

### Query Optimization

```typescript
// ✅ Используй select для выборки только нужных полей
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // Не тянем password, createdAt, etc.
  },
});

// ✅ Пагинация обязательна для списков
const users = await prisma.user.findMany({
  take: 10,
  skip: (page - 1) * 10,
  orderBy: { createdAt: "desc" },
});

// ✅ Используй cursor-based pagination для больших датасетов
const users = await prisma.user.findMany({
  take: 10,
  skip: 1,
  cursor: { id: lastUserId },
});
```

### Avoiding N+1

```typescript
// ❌ N+1 проблема
const users = await prisma.user.findMany();
for (const user of users) {
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
  });
}

// ✅ Один запрос с include
const users = await prisma.user.findMany({
  include: {
    bookings: {
      take: 5,
      orderBy: { createdAt: "desc" },
    },
  },
});
```

### Indexes

```prisma
// prisma/schema.prisma
model Booking {
  id        String   @id @default(cuid())
  userId    String
  serviceId String
  date      DateTime
  status    BookingStatus

  user    User    @relation(fields: [userId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])

  // Индексы для частых запросов
  @@index([userId])
  @@index([serviceId])
  @@index([date])
  @@index([status, date])
}
```

### Connection Pooling

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## Caching Strategies

### React Cache

```typescript
import { cache } from "react";

// Кэширует результат в рамках одного запроса
export const getUser = cache(async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
});

// Теперь можно вызывать в разных компонентах — запрос выполнится 1 раз
```

### unstable_cache

```typescript
import { unstable_cache } from "next/cache";

// Кэширует между запросами с ревалидацией
export const getPopularServices = unstable_cache(
  async () => {
    return prisma.service.findMany({
      orderBy: { bookingsCount: "desc" },
      take: 10,
    });
  },
  ["popular-services"], // Cache key
  {
    revalidate: 3600, // 1 час
    tags: ["services"],
  }
);
```

### Revalidation

```typescript
import { revalidatePath, revalidateTag } from "next/cache";

// После создания booking
async function createBooking(data: BookingInput) {
  const booking = await prisma.booking.create({ data });

  // Ревалидируем страницы
  revalidatePath("/dashboard");
  revalidatePath(`/services/${data.serviceId}`);

  // Или по тегу
  revalidateTag("bookings");

  return booking;
}
```

### React Query (Client-side)

```typescript
// src/hooks/use-bookings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => fetchBookings(),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000, // 30 минут
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
```

---

## Bundle Optimization

### Analyzing Bundle

```bash
# Анализ bundle
npm run build
npx @next/bundle-analyzer
```

### Tree Shaking

```typescript
// ✅ Импортируй только нужное
import { format, parseISO } from "date-fns";

// ❌ Не импортируй всю библиотеку
import * as dateFns from "date-fns";
```

### Code Splitting

```typescript
// Автоматический code splitting по route
// Каждая страница — отдельный chunk

// Ручной code splitting для тяжёлых библиотек
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFViewer), {
  ssr: false,
});
```

### External Packages

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    // Серверные зависимости не попадут в client bundle
    serverComponentsExternalPackages: ["sharp", "bcryptjs"],
  },
};
```

---

## Monitoring

### Sentry Performance

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% транзакций
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration(), Sentry.browserTracingIntegration()],
});
```

### Custom Performance Marks

```typescript
// Измерение кастомных операций
export async function heavyOperation() {
  const start = performance.now();

  // ... operation

  const duration = performance.now() - start;

  // Отправка в аналитику
  if (duration > 1000) {
    console.warn(`heavyOperation took ${duration}ms`);
    Sentry.captureMessage("Slow operation", {
      extra: { operation: "heavyOperation", duration },
    });
  }
}
```

### Vercel Analytics

```typescript
// src/app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Чеклист

### Core Web Vitals

- [ ] LCP < 2.5s (оптимизированы hero images)
- [ ] INP < 200ms (нет blocking operations)
- [ ] CLS < 0.1 (размеры images/fonts заданы)
- [ ] FCP < 1.8s (критический CSS inline)

### Next.js

- [ ] Server Components по умолчанию
- [ ] Client Components только где нужно
- [ ] Streaming с Suspense для тяжёлых компонентов
- [ ] Параллельная загрузка данных
- [ ] Dynamic imports для тяжёлых библиотек

### Images

- [ ] Все images через `next/image`
- [ ] AVIF/WebP форматы включены
- [ ] priority для LCP images
- [ ] Правильные sizes для responsive

### Database

- [ ] select вместо полной выборки
- [ ] Пагинация для всех списков
- [ ] Индексы на часто используемых полях
- [ ] Нет N+1 запросов

### Caching

- [ ] React cache() для request deduplication
- [ ] unstable_cache для дорогих запросов
- [ ] revalidatePath/Tag после мутаций
- [ ] React Query для client-side caching

### Bundle

- [ ] Bundle analyzer проверен
- [ ] Tree shaking работает
- [ ] Нет unused dependencies
- [ ] Heavy libs загружаются dynamically

### Monitoring

- [ ] Sentry Performance настроен
- [ ] Vercel Analytics включен
- [ ] Web Vitals отслеживаются
- [ ] Alerts на degradation

---

_См. также:_

- [Frontend Guide](./frontend.md)
- [Backend Guide](./backend.md)
- [SEO Guide](./seo.md)
