# Security Guide

Руководство по безопасности в проекте DocConnect.

---

## Содержание

1. [Принципы безопасности](#принципы-безопасности)
2. [Аутентификация](#аутентификация)
3. [Авторизация](#авторизация)
4. [Защита данных](#защита-данных)
5. [Input Validation](#input-validation)
6. [OWASP Top 10](#owasp-top-10)
7. [Security Headers](#security-headers)
8. [Чеклист](#чеклист)

---

## Принципы безопасности

### Defense in Depth

```
┌─────────────────────────────────────────────┐
│              Edge (Vercel/CDN)              │  ← WAF, DDoS protection
├─────────────────────────────────────────────┤
│              Middleware                      │  ← Auth check, CSP
├─────────────────────────────────────────────┤
│            Server Actions                    │  ← Validation, Rate limiting
├─────────────────────────────────────────────┤
│              Services                        │  ← Business rules, Authorization
├─────────────────────────────────────────────┤
│            Database (Prisma)                 │  ← Prepared statements
└─────────────────────────────────────────────┘
```

### Принцип минимальных привилегий

- Каждый пользователь имеет только необходимые права
- Server Actions проверяют права на каждое действие
- API keys имеют ограниченные scopes

---

## Аутентификация

### NextAuth v5 Configuration

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials;

        const user = await prisma.user.findUnique({
          where: { email: email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password as string, user.password);

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
```

### Password Requirements

```typescript
// src/server/validators/auth.validators.ts
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .regex(/[A-Z]/, "Нужна хотя бы одна заглавная буква")
  .regex(/[a-z]/, "Нужна хотя бы одна строчная буква")
  .regex(/[0-9]/, "Нужна хотя бы одна цифра")
  .regex(/[^A-Za-z0-9]/, "Нужен хотя бы один спецсимвол");

export const registerSchema = z
  .object({
    email: z.string().email("Некорректный email"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });
```

### Password Hashing

```typescript
// Хеширование при регистрации
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## Авторизация

### Role-Based Access Control (RBAC)

```typescript
// src/lib/permissions.ts
export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
}

export const permissions = {
  // Resources
  "user:read": [Role.USER, Role.ADMIN, Role.MODERATOR],
  "user:update": [Role.USER, Role.ADMIN],
  "user:delete": [Role.ADMIN],

  "booking:create": [Role.USER, Role.ADMIN],
  "booking:read": [Role.USER, Role.ADMIN, Role.MODERATOR],
  "booking:cancel": [Role.USER, Role.ADMIN],

  "admin:access": [Role.ADMIN],
  "admin:users": [Role.ADMIN],
  "admin:reports": [Role.ADMIN, Role.MODERATOR],
} as const;

export function hasPermission(userRole: Role, permission: keyof typeof permissions): boolean {
  return permissions[permission].includes(userRole);
}
```

### Middleware Protection

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/", "/login", "/register", "/pricing"];
const adminPaths = ["/admin"];
const protectedPaths = ["/dashboard", "/profile", "/bookings"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Not logged in - redirect to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin paths
  if (adminPaths.some((p) => pathname.startsWith(p))) {
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Server Action Authorization

```typescript
// src/lib/safe-action.ts
import { auth } from "@/lib/auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

interface ActionOptions {
  requireAuth?: boolean;
  requiredRole?: Role;
  permission?: keyof typeof permissions;
}

export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (data: TInput, userId: string) => Promise<TOutput>,
  options: ActionOptions = { requireAuth: true }
) {
  return async (input: TInput) => {
    try {
      const session = await auth();

      // Auth check
      if (options.requireAuth !== false && !session?.user?.id) {
        throw new UnauthorizedError();
      }

      // Role check
      if (options.requiredRole && session?.user?.role !== options.requiredRole) {
        throw new ForbiddenError("Недостаточно прав");
      }

      // Permission check
      if (options.permission) {
        if (!hasPermission(session?.user?.role as Role, options.permission)) {
          throw new ForbiddenError("Недостаточно прав");
        }
      }

      // Validation and execution
      const validated = schema.safeParse(input);
      if (!validated.success) {
        return { success: false, error: validated.error.errors[0].message };
      }

      const data = await handler(validated.data, session?.user?.id ?? "");
      return { success: true, data };
    } catch (error) {
      // Error handling
    }
  };
}
```

---

## Защита данных

### Sensitive Data Handling

```typescript
// ❌ НИКОГДА не логируй sensitive data
console.log("User login:", { email, password }); // ПЛОХО!

// ✅ Маскируй sensitive data
console.log("User login:", { email, password: "***" });

// ✅ Используй структурированный logger
import { logger } from "@/lib/logger";
logger.info("User login attempt", { email });
```

### Data Masking

```typescript
// src/lib/utils/mask.ts
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

export function maskCardNumber(card: string): string {
  return `****${card.slice(-4)}`;
}
```

### Environment Variables

```bash
# .env.local — НИКОГДА не коммить!
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..." # 32+ символа, crypto random
STRIPE_SECRET_KEY="sk_live_..."
RESEND_API_KEY="re_..."

# Публичные (начинаются с NEXT_PUBLIC_)
NEXT_PUBLIC_APP_URL="https://example.com"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

```typescript
// src/lib/env.ts — валидация env переменных
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
});

export const env = envSchema.parse(process.env);
```

---

## Input Validation

### Server-Side Validation

```typescript
// ВСЕГДА валидируй на сервере, даже если есть client validation
// src/server/validators/booking.validators.ts
import { z } from "zod";

export const createBookingSchema = z.object({
  serviceId: z.string().cuid("Invalid service ID"),
  date: z.coerce.date().min(new Date(), "Дата должна быть в будущем"),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  notes: z
    .string()
    .max(500, "Максимум 500 символов")
    .optional()
    .transform((val) => val?.trim()),
});
```

### Sanitization

```typescript
// src/lib/utils/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

// Для user-generated content
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target"],
  });
}

// Для plain text
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, "") // Remove HTML brackets
    .trim();
}
```

---

## OWASP Top 10

### 1. Injection

```typescript
// ✅ Prisma автоматически использует prepared statements
const user = await prisma.user.findUnique({
  where: { email: userInput }, // Safe — параметризованный запрос
});

// ❌ НИКОГДА не делай так
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${userInput}'` // SQL Injection!
);

// ✅ Если нужен raw SQL, используй параметры
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

### 2. Broken Authentication

```typescript
// ✅ Rate limiting для login
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 попыток в минуту
});

async function loginAction(email: string, password: string) {
  const { success } = await ratelimit.limit(email);
  if (!success) {
    throw new Error("Слишком много попыток. Попробуйте позже.");
  }
  // ... login logic
}
```

### 3. XSS (Cross-Site Scripting)

```typescript
// ✅ React автоматически экранирует
<p>{userInput}</p> // Safe

// ❌ Опасно — никогда не используй для user input
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Если нужен HTML, санитизируй
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />
```

### 4. CSRF (Cross-Site Request Forgery)

```typescript
// NextAuth автоматически защищает от CSRF
// Server Actions тоже защищены по умолчанию

// Для кастомных форм используй csrf token
import { getCsrfToken } from "next-auth/react";

function Form() {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    getCsrfToken().then(setCsrfToken);
  }, []);

  return (
    <form action="/api/custom">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      {/* ... */}
    </form>
  );
}
```

### 5. Security Misconfiguration

```typescript
// next.config.ts — Security headers
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
];
```

---

## Security Headers

### Content Security Policy (CSP)

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    connect-src 'self' https://*.sentry.io https://api.stripe.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);

  return response;
}
```

### Using Nonce in Scripts

```typescript
// src/app/layout.tsx
import { headers } from "next/headers";
import Script from "next/script";

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="ru">
      <body>
        {children}
        <Script
          src="https://js.stripe.com/v3/"
          nonce={nonce}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
```

---

## Чеклист

### Аутентификация

- [ ] Пароли хешируются с bcrypt (12+ rounds)
- [ ] JWT токены имеют срок действия
- [ ] Refresh tokens защищены
- [ ] Rate limiting на login endpoint
- [ ] Account lockout после N неудачных попыток

### Авторизация

- [ ] Каждый Server Action проверяет auth
- [ ] Role-based access control
- [ ] Защита admin routes в middleware
- [ ] Нет прямого доступа к чужим данным

### Защита данных

- [ ] Sensitive data не логируется
- [ ] .env файлы в .gitignore
- [ ] Secrets только через env variables
- [ ] Database credentials безопасно хранятся

### Input/Output

- [ ] Все input валидируется на сервере (Zod)
- [ ] User-generated HTML санитизируется
- [ ] Нет SQL injection (Prisma)
- [ ] Нет XSS (React escaping)

### Headers & Config

- [ ] HTTPS only (HSTS)
- [ ] CSP configured
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured

### Monitoring

- [ ] Sentry для error tracking
- [ ] Security alerts настроены
- [ ] Audit log для sensitive actions
- [ ] Зависимости регулярно обновляются

---

_См. также:_

- [Backend Guide](./backend.md)
- [Testing Guide](./testing.md)
- [Architecture Overview](../architecture/overview.md)
