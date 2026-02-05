# Performance Checklist

Чеклист для поддержания высокой производительности приложения.

---

## 🎯 Цели

| Метрика                        | Цель   | Критично |
| ------------------------------ | ------ | -------- |
| Lighthouse Performance         | >90    | >80      |
| First Contentful Paint (FCP)   | <1.8s  | <3s      |
| Largest Contentful Paint (LCP) | <2.5s  | <4s      |
| Cumulative Layout Shift (CLS)  | <0.1   | <0.25    |
| Time to Interactive (TTI)      | <3.8s  | <7.3s    |
| Bundle Size (main)             | <200KB | <300KB   |

---

## ✅ Чеклист по категориям

### Изображения

- [ ] Все изображения через `next/image` (не `<img>`)
- [ ] Используются форматы AVIF/WebP (настроено в next.config.ts)
- [ ] Указаны `width` и `height` для предотвращения CLS
- [ ] Используется `priority` для LCP изображений (hero, above-the-fold)
- [ ] Lazy loading для below-the-fold изображений (по умолчанию)
- [ ] Placeholder blur для больших изображений
- [ ] Remote patterns настроены в `next.config.ts`

```tsx
// ✅ Хорошо
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // LCP image
  placeholder="blur"
/>

// ❌ Плохо
<img src="/hero.jpg" alt="Hero" />
```

### Шрифты

- [ ] Шрифты через `next/font` (не Google Fonts CDN)
- [ ] Subset указан (обычно `latin`)
- [ ] `display: swap` для FOUT вместо FOIT
- [ ] Preload для critical шрифтов

```tsx
// ✅ Хорошо
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// ❌ Плохо
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />;
```

### JavaScript

- [ ] Все heavy компоненты через `dynamic()` import
- [ ] Аналитика через `next/script` с `strategy="lazyOnload"`
- [ ] Нет unused dependencies в bundle
- [ ] Tree shaking работает (named imports)
- [ ] Ни один chunk не превышает 200KB

```tsx
// ✅ Хорошо - dynamic import
const Map = dynamic(() => import("@/components/map"), {
  loading: () => <SkeletonMap />,
  ssr: false,
});

// ✅ Хорошо - lazy script
<Script src="https://analytics.example.com/script.js" strategy="lazyOnload" />;

// ❌ Плохо
import Map from "@/components/map"; // Heavy component
import * as lodash from "lodash"; // Full import
```

### React & Rendering

- [ ] Server Components по умолчанию
- [ ] `"use client"` только где необходимо
- [ ] Streaming с Suspense для async данных
- [ ] Skeleton screens вместо spinners
- [ ] Error boundaries для graceful degradation

```tsx
// ✅ Хорошо - Streaming
async function Page() {
  return (
    <>
      <Header /> {/* Сразу показывается */}
      <Suspense fallback={<SkeletonList />}>
        <AsyncData /> {/* Стримится когда готово */}
      </Suspense>
    </>
  );
}

// ❌ Плохо - Блокирующий fetch
async function Page() {
  const data = await fetchData(); // Блокирует весь рендер
  return <Content data={data} />;
}
```

### База данных (Prisma)

- [ ] `select` только нужные поля (не `include` всего)
- [ ] Нет N+1 queries (используем `include` где нужно)
- [ ] Индексы на часто queried полях
- [ ] Connection pooling настроен (Supabase Transaction Pooler)
- [ ] Pagination для списков

```typescript
// ✅ Хорошо
const users = await db.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
  take: 20,
  skip: page * 20,
});

// ❌ Плохо
const users = await db.user.findMany({
  include: {
    posts: true, // Загружает все посты
    comments: true, // Загружает все комментарии
    followers: true, // Загружает всех followers
  },
});
```

### Caching

- [ ] `unstable_cache` для heavy queries
- [ ] `revalidateTag` для инвалидации
- [ ] Static generation где возможно
- [ ] ISR для semi-static контента
- [ ] HTTP cache headers настроены

```typescript
// ✅ Хорошо - Cached query
import { unstable_cache } from "next/cache";

const getCachedProviders = unstable_cache(
  async (city: string) => db.provider.findMany({ where: { city } }),
  ["providers"],
  { revalidate: 3600, tags: ["providers"] }
);
```

---

## 🔧 Инструменты

### Bundle Analyzer

Анализ размера бандла:

```bash
# Установить (если не установлен)
npm install -D @next/bundle-analyzer

# Запустить анализ
ANALYZE=true npm run build
```

Конфигурация в `next.config.ts`:

```typescript
import withBundleAnalyzer from "@next/bundle-analyzer";

const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
```

### Lighthouse CI

Автоматический Lighthouse в CI:

```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://example.com/
      https://example.com/search
    budgetPath: ./budget.json
```

### Core Web Vitals Monitoring

```typescript
// src/app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 📊 Мониторинг

### Vercel Analytics

- Real-time Core Web Vitals
- Device/browser breakdown
- Geographic distribution

### Sentry Performance

- Transaction traces
- Slow queries detection
- Error correlation

### Custom Logging

```typescript
// Report Web Vitals
export function reportWebVitals(metric: NextWebVitalsMetric) {
  console.log(metric);
  // Send to analytics
}
```

---

## 🚀 Quick Wins

1. **Добавить `priority` на hero image** — мгновенное улучшение LCP
2. **Dynamic import для модалок** — уменьшает initial bundle
3. **Suspense для списков** — улучшает perceived performance
4. **Убрать unused dependencies** — уменьшает bundle size
5. **Prefetch для ключевых ссылок** — улучшает navigation

---

## ⚠️ Антипаттерны

| Антипаттерн              | Проблема         | Решение                   |
| ------------------------ | ---------------- | ------------------------- |
| `<img>` вместо `<Image>` | Нет оптимизации  | Использовать `next/image` |
| `import * as`            | Нет tree shaking | Named imports             |
| `useEffect` для fetch    | Client waterfall | Server Component          |
| Inline styles            | Большой HTML     | Tailwind классы           |
| `any` типы               | Bundle bloat     | Строгая типизация         |
| Sync analytics           | Блокирует рендер | `strategy="lazyOnload"`   |

---

## 📅 Регулярные проверки

### Еженедельно

- [ ] Lighthouse score на ключевых страницах
- [ ] Bundle size не вырос существенно
- [ ] No new console warnings

### Перед релизом

- [ ] Full Lighthouse audit
- [ ] Bundle analyzer check
- [ ] Core Web Vitals в норме
- [ ] No accessibility regressions

### Ежемесячно

- [ ] Dependencies audit и update
- [ ] Database query optimization review
- [ ] Cache strategy review

---

_Последнее обновление: Февраль 2026_
