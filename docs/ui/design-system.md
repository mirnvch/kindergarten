# Design System

Руководство по дизайн-системе проекта DocConnect.

---

## Содержание

1. [Принципы дизайна](#принципы-дизайна)
2. [Цветовая палитра](#цветовая-палитра)
3. [Типографика](#типографика)
4. [Spacing & Layout](#spacing--layout)
5. [Shadows & Effects](#shadows--effects)
6. [Icons](#icons)
7. [Motion](#motion)
8. [Dark Mode](#dark-mode)

---

## Принципы дизайна

### Основные принципы

| Принцип           | Описание                                       |
| ----------------- | ---------------------------------------------- |
| **Clarity**       | Интерфейс должен быть понятен без инструкций   |
| **Consistency**   | Одинаковые элементы ведут себя одинаково везде |
| **Accessibility** | Доступен для всех пользователей (WCAG 2.1 AA)  |
| **Performance**   | Минимум визуального шума, максимум скорости    |

### Иерархия

```
1. Primary Actions  — одно главное действие на экране
2. Secondary Actions — дополнительные действия
3. Tertiary Actions — редко используемые действия
```

---

## Цветовая палитра

### CSS Variables

```css
/* src/app/globals.css */
:root {
  /* Background */
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;

  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;

  /* Popover */
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;

  /* Primary — main brand color */
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 98%;

  /* Secondary — subtle backgrounds */
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;

  /* Muted — disabled, placeholder */
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;

  /* Accent — hover states */
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;

  /* Semantic colors */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;

  --success: 142 76% 36%;
  --success-foreground: 0 0% 98%;

  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 9%;

  /* Border & Input */
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 221 83% 53%;

  /* Border Radius */
  --radius: 0.5rem;
}
```

### Semantic Usage

```typescript
// ✅ Правильное использование
<Button>Primary Action</Button>                      // --primary
<Button variant="secondary">Cancel</Button>          // --secondary
<Button variant="destructive">Delete</Button>        // --destructive
<Button variant="outline">Edit</Button>              // --border

// ✅ Текст
<p className="text-foreground">Main text</p>
<p className="text-muted-foreground">Secondary text</p>

// ✅ Backgrounds
<div className="bg-background">Page</div>
<div className="bg-card">Card</div>
<div className="bg-muted">Subtle section</div>
```

### Color Contrast

```
Минимальный контраст (WCAG AA):
- Обычный текст: 4.5:1
- Крупный текст (18px+): 3:1
- UI компоненты: 3:1

Проверка: https://webaim.org/resources/contrastchecker/
```

---

## Типографика

### Font Stack

```typescript
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
});
```

### Type Scale

```css
/* Tailwind classes */
.text-xs {
  font-size: 0.75rem;
} /* 12px */
.text-sm {
  font-size: 0.875rem;
} /* 14px */
.text-base {
  font-size: 1rem;
} /* 16px — base */
.text-lg {
  font-size: 1.125rem;
} /* 18px */
.text-xl {
  font-size: 1.25rem;
} /* 20px */
.text-2xl {
  font-size: 1.5rem;
} /* 24px */
.text-3xl {
  font-size: 1.875rem;
} /* 30px */
.text-4xl {
  font-size: 2.25rem;
} /* 36px */
```

### Usage Guidelines

```typescript
// Headings
<h1 className="text-4xl font-bold tracking-tight">Page Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<h3 className="text-xl font-semibold">Subsection</h3>

// Body text
<p className="text-base text-foreground">Main content</p>
<p className="text-sm text-muted-foreground">Secondary content</p>

// Small text
<span className="text-xs text-muted-foreground">Caption</span>

// Code
<code className="font-mono text-sm">inline code</code>
```

---

## Spacing & Layout

### Spacing Scale

```css
/* Tailwind spacing (1 unit = 4px) */
.p-0 {
  padding: 0;
}
.p-1 {
  padding: 0.25rem;
} /* 4px */
.p-2 {
  padding: 0.5rem;
} /* 8px */
.p-3 {
  padding: 0.75rem;
} /* 12px */
.p-4 {
  padding: 1rem;
} /* 16px */
.p-5 {
  padding: 1.25rem;
} /* 20px */
.p-6 {
  padding: 1.5rem;
} /* 24px */
.p-8 {
  padding: 2rem;
} /* 32px */
.p-10 {
  padding: 2.5rem;
} /* 40px */
.p-12 {
  padding: 3rem;
} /* 48px */
```

### Component Spacing

```typescript
// Внутренний padding
<Card className="p-4">          // Compact card
<Card className="p-6">          // Default card
<section className="py-12">     // Page section

// Gaps
<div className="flex gap-2">    // Tight items
<div className="flex gap-4">    // Default items
<div className="grid gap-6">    // Cards grid
<div className="space-y-8">     // Sections
```

### Container Widths

```css
/* Max widths */
.max-w-sm {
  max-width: 24rem;
} /* 384px  — small modals */
.max-w-md {
  max-width: 28rem;
} /* 448px  — forms */
.max-w-lg {
  max-width: 32rem;
} /* 512px  — dialogs */
.max-w-xl {
  max-width: 36rem;
} /* 576px  — content */
.max-w-2xl {
  max-width: 42rem;
} /* 672px  — articles */
.max-w-4xl {
  max-width: 56rem;
} /* 896px  — wide content */
.max-w-6xl {
  max-width: 72rem;
} /* 1152px — page container */
.max-w-7xl {
  max-width: 80rem;
} /* 1280px — full width */
```

### Grid System

```typescript
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id}>{item.name}</Card>
  ))}
</div>

// Sidebar layout
<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
  <aside>Sidebar</aside>
  <main>Content</main>
</div>
```

---

## Shadows & Effects

### Shadow Scale

```css
/* shadows */
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
.shadow {
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
}
.shadow-md {
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
}
.shadow-lg {
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}
.shadow-xl {
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

### Usage

```typescript
// Cards
<Card className="shadow-sm">Default card</Card>
<Card className="shadow-lg">Elevated card</Card>

// Modals
<DialogContent className="shadow-xl">Modal</DialogContent>

// Hover states
<Card className="shadow-sm hover:shadow-md transition-shadow">
  Hoverable card
</Card>
```

### Border Radius

```css
.rounded-none {
  border-radius: 0;
}
.rounded-sm {
  border-radius: 0.125rem;
} /* 2px */
.rounded {
  border-radius: 0.25rem;
} /* 4px */
.rounded-md {
  border-radius: 0.375rem;
} /* 6px */
.rounded-lg {
  border-radius: var(--radius);
} /* 8px — default */
.rounded-xl {
  border-radius: 0.75rem;
} /* 12px */
.rounded-2xl {
  border-radius: 1rem;
} /* 16px */
.rounded-full {
  border-radius: 9999px;
} /* Pills, avatars */
```

---

## Icons

### Lucide Icons

```typescript
// Используем Lucide React
import { Search, User, Settings, ChevronRight } from "lucide-react";

// Sizes
<Search className="h-4 w-4" />  // Small (в кнопках)
<Search className="h-5 w-5" />  // Default
<Search className="h-6 w-6" />  // Large

// Colors
<Search className="text-muted-foreground" />
<Search className="text-primary" />

// В кнопках
<Button>
  <Search className="mr-2 h-4 w-4" />
  Search
</Button>

// Icon-only button
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
  <span className="sr-only">Settings</span>
</Button>
```

### Icon Guidelines

```
1. Всегда добавляй sr-only label для icon-only buttons
2. Используй consistent sizing внутри одного контекста
3. Иконки слева от текста в buttons
4. Chevron справа для навигации
```

---

## Motion

### Transitions

```css
/* Default transition */
.transition-all {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Specific transitions */
.transition-colors {
  transition:
    color,
    background-color,
    border-color 150ms;
}
.transition-opacity {
  transition: opacity 150ms;
}
.transition-shadow {
  transition: box-shadow 150ms;
}
.transition-transform {
  transition: transform 150ms;
}
```

### Usage

```typescript
// Hover states
<Button className="transition-colors hover:bg-primary/90">
  Hover me
</Button>

// Card hover
<Card className="transition-all hover:shadow-lg hover:-translate-y-1">
  Lift on hover
</Card>

// Skeleton animation
<div className="animate-pulse bg-muted rounded h-4 w-full" />
```

### Animation Principles

```
1. Subtle — анимации не должны отвлекать
2. Fast — 150-300ms для микро-анимаций
3. Purposeful — анимация должна помогать понять UI
4. Respectful — учитывай prefers-reduced-motion
```

```typescript
// Учитываем пользовательские настройки
<div className="animate-pulse motion-reduce:animate-none">
  Loading...
</div>
```

---

## Dark Mode

### Implementation

```typescript
// src/components/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

### Dark Mode Colors

```css
/* src/app/globals.css */
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;

  --card: 0 0% 3.9%;
  --card-foreground: 0 0% 98%;

  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 98%;

  --secondary: 0 0% 14.9%;
  --secondary-foreground: 0 0% 98%;

  --muted: 0 0% 14.9%;
  --muted-foreground: 0 0% 63.9%;

  --accent: 0 0% 14.9%;
  --accent-foreground: 0 0% 98%;

  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;

  --border: 0 0% 14.9%;
  --input: 0 0% 14.9%;
  --ring: 221 83% 53%;
}
```

### Theme Toggler

```typescript
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

_См. также:_

- [Components](./components.md)
- [Accessibility](./accessibility.md)
- [Frontend Guide](../guides/frontend.md)
