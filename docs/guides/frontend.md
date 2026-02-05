# Frontend Development Guide

Руководство по разработке фронтенда в проекте DocConnect.

---

## Содержание

1. [Архитектура компонентов](#архитектура-компонентов)
2. [Стилизация](#стилизация)
3. [Состояние](#состояние)
4. [Формы](#формы)
5. [Паттерны](#паттерны)
6. [Чеклист](#чеклист)

---

## Архитектура компонентов

### Server vs Client Components

```
По умолчанию: Server Components
"use client" только когда нужно:
  - useState, useEffect, hooks
  - Event handlers (onClick, onChange)
  - Browser APIs (localStorage, window)
  - Third-party client libraries
```

### Структура компонентов

```
src/components/
├── ui/                    # Базовые UI (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── forms/                 # Компоненты форм
│   ├── login-form.tsx
│   └── profile-form.tsx
├── layouts/               # Layout компоненты
│   ├── header.tsx
│   ├── footer.tsx
│   └── sidebar.tsx
└── [feature]/             # По фичам
    ├── booking-card.tsx
    └── booking-list.tsx
```

### Naming Conventions

| Тип             | Формат             | Пример             |
| --------------- | ------------------ | ------------------ |
| Файл компонента | kebab-case         | `user-profile.tsx` |
| Компонент       | PascalCase         | `UserProfile`      |
| Props interface | PascalCase + Props | `UserProfileProps` |
| Hook            | camelCase + use    | `useUserProfile`   |

### Шаблон компонента

```typescript
// src/components/feature/user-card.tsx
import { cn } from "@/lib/utils";

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  className?: string;
  onSelect?: (id: string) => void;
}

export function UserCard({ user, className, onSelect }: UserCardProps) {
  return (
    <div
      className={cn("rounded-lg border p-4", className)}
      onClick={() => onSelect?.(user.id)}
    >
      <h3 className="font-semibold">{user.name}</h3>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </div>
  );
}
```

---

## Стилизация

### Tailwind CSS 4

- Используем Tailwind CSS 4 с новым синтаксисом
- Кастомные стили через CSS variables в `globals.css`
- Utility-first подход

### Design Tokens

```css
/* src/app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  /* ... */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

### Утилита cn()

```typescript
// Всегда используй cn() для объединения классов
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-class",
  className  // props className последним
)} />
```

### Responsive Design

```typescript
// Mobile-first подход
<div className="
  px-4          // mobile: 16px
  md:px-6       // tablet: 24px
  lg:px-8       // desktop: 32px
">

// Breakpoints:
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
// 2xl: 1536px
```

---

## Состояние

### Локальное состояние

```typescript
// useState для простого UI состояния
const [isOpen, setIsOpen] = useState(false);

// useReducer для сложного состояния
const [state, dispatch] = useReducer(reducer, initialState);
```

### Серверное состояние

```typescript
// React Query для кэширования и синхронизации
import { useQuery, useMutation } from "@tanstack/react-query";

function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
```

### Глобальное состояние

```typescript
// Zustand для глобального UI состояния
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

---

## Формы

### React Hook Form + Zod

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  email: z.string().email("Некорректный email"),
});

type FormData = z.infer<typeof schema>;

export function ProfileForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  async function onSubmit(data: FormData) {
    const result = await updateProfile(data);
    if (!result.success) {
      form.setError("root", { message: result.error });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Сохранение..." : "Сохранить"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Паттерны

### Loading States (Skeletons, не Spinners)

```typescript
// ❌ Плохо
{isLoading && <Spinner />}

// ✅ Хорошо
{isLoading && <UserCardSkeleton />}

// Skeleton компонент
function UserCardSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}
```

### Error States

```typescript
// Error boundary для секции
<ErrorBoundary fallback={<ErrorCard />}>
  <UserProfile />
</ErrorBoundary>

// Inline error
{error && (
  <Alert variant="destructive">
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
)}
```

### Optimistic Updates

```typescript
import { useOptimistic } from "react";

function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    initialLikes,
    (state, _) => state + 1
  );

  async function handleLike() {
    addOptimisticLike(null);
    await likeAction();
  }

  return <Button onClick={handleLike}>{optimisticLikes} ❤️</Button>;
}
```

### Composition Pattern

```typescript
// Используй композицию вместо props drilling
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {children}
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## Чеклист

### Перед коммитом

- [ ] TypeScript без ошибок (`npm run typecheck`)
- [ ] ESLint без ошибок (`npm run lint`)
- [ ] Компонент работает на mobile
- [ ] Нет `any` типов
- [ ] Нет `console.log`
- [ ] Props типизированы
- [ ] Loading state есть
- [ ] Error state есть

### Accessibility

- [ ] Семантический HTML (`<button>`, `<nav>`, `<main>`)
- [ ] Alt текст для изображений
- [ ] Aria-labels для иконок-кнопок
- [ ] Focus visible стили
- [ ] Keyboard navigation работает
- [ ] Color contrast >= 4.5:1

### Performance

- [ ] Images через `next/image`
- [ ] Fonts через `next/font`
- [ ] Heavy компоненты через `dynamic()`
- [ ] Нет лишних re-renders (React DevTools)

---

_См. также:_

- [Design System](../ui/design-system.md)
- [Components](../ui/components.md)
- [Testing Guide](./testing.md)
