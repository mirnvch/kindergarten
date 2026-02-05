# ADR-002: Аутентификация — NextAuth.js v5

**Статус:** Accepted

**Дата:** 2026-01-29

**Авторы:** @mrnvch

---

## Контекст

Нужна система аутентификации для DocConnect.

**Требования:**

- Email/password регистрация
- OAuth (Google как минимум)
- JWT для stateless сессий
- Совместимость с Edge Runtime (middleware)
- Role-based access control (RBAC)
- 2FA поддержка

**Ограничения:**

- Next.js App Router
- Vercel Edge Functions
- Prisma для хранения пользователей

---

## Рассмотренные варианты

### Вариант 1: NextAuth.js v5 (Auth.js)

**Описание:**
Официальная библиотека аутентификации для Next.js, переименованная в Auth.js.

**Плюсы:**

- Официальная поддержка Next.js 15+
- App Router native
- Встроенные OAuth провайдеры (Google, GitHub, etc.)
- Prisma Adapter
- Edge-compatible (с разделением конфига)
- JWT strategy для serverless

**Минусы:**

- v5 в beta (breaking changes возможны)
- Ограничения в Edge Runtime (нет Prisma adapter в middleware)
- Сложная настройка для Edge

### Вариант 2: Clerk

**Описание:**
Полностью managed authentication service.

**Плюсы:**

- Простая интеграция
- UI компоненты из коробки
- 2FA, MFA встроены
- Webhooks

**Минусы:**

- Vendor lock-in
- Дорого при масштабировании ($25+/mo)
- Меньше контроля

### Вариант 3: Lucia

**Описание:**
Lightweight auth library.

**Плюсы:**

- Легковесная
- Полный контроль
- Без vendor lock-in

**Минусы:**

- Больше ручной работы
- Меньше встроенных провайдеров
- Меньшее сообщество

### Вариант 4: Custom (jose + bcrypt)

**Описание:**
Полностью кастомная реализация.

**Плюсы:**

- Полный контроль
- Никаких зависимостей

**Минусы:**

- Риск security issues
- Много boilerplate
- Поддержка на нас

---

## Решение

Выбран **NextAuth.js v5** потому что:

1. **Официальная интеграция** с Next.js App Router
2. **OAuth провайдеры** из коробки
3. **Prisma Adapter** для хранения сессий
4. **JWT strategy** для serverless/Edge
5. **Активное сообщество** и документация

---

## Архитектура

### Разделение конфигурации для Edge

```
src/lib/
├── auth.config.ts    # Edge-compatible (без Prisma, bcrypt)
├── auth.ts           # Полная конфигурация (с adapter)
└── auth-helpers.ts   # Вспомогательные функции
```

```typescript
// auth.config.ts — для middleware (Edge)
export default {
  providers: [Google],
  callbacks: {
    authorized: ({ auth, request }) => {
      // Проверка авторизации
    },
  },
} satisfies NextAuthConfig;

// auth.ts — для server (Node.js)
import authConfig from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { auth, handlers } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
});
```

### Middleware

```typescript
// middleware.ts (proxy.ts)
import authConfig from "./lib/auth.config";
import NextAuth from "next-auth";

export const { auth: middleware } = NextAuth(authConfig);
```

---

## Реализованный функционал

- [x] Email/password регистрация
- [x] Google OAuth
- [x] JWT сессии
- [x] Role-based access (PATIENT, PROVIDER, ADMIN)
- [x] 2FA (TOTP)
- [x] Trusted devices
- [x] Session management
- [x] Password reset

---

## Последствия

### Положительные

- Быстрая реализация OAuth
- Стандартное решение для Next.js
- Хорошая документация

### Отрицательные

- Сложность Edge-совместимости
- Beta статус v5
- Необходимость двух конфигов

### Риски

- **Риск:** Breaking changes в v5
  - **Митигация:** Тесты, следить за changelog, pinned версия

- **Риск:** Edge limitations
  - **Митигация:** Разделение конфигов уже реализовано

---

## Ссылки

- [Auth.js Docs](https://authjs.dev/)
- [NextAuth v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [Prisma Adapter](https://authjs.dev/reference/adapter/prisma)
