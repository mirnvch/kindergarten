# Accessibility Guide

Руководство по доступности (a11y) в проекте DocConnect. Цель: соответствие WCAG 2.1 Level AA.

---

## Содержание

1. [Принципы WCAG](#принципы-wcag)
2. [Семантический HTML](#семантический-html)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Screen Readers](#screen-readers)
5. [Color & Contrast](#color--contrast)
6. [Forms](#forms)
7. [Images & Media](#images--media)
8. [Testing](#testing)
9. [Чеклист](#чеклист)

---

## Принципы WCAG

### POUR

| Принцип            | Описание                                              |
| ------------------ | ----------------------------------------------------- |
| **Perceivable**    | Контент должен быть воспринимаем всеми пользователями |
| **Operable**       | Интерфейс должен работать для всех способов ввода     |
| **Understandable** | Контент и навигация должны быть понятны               |
| **Robust**         | Контент должен работать с разными технологиями        |

### Уровни соответствия

```
Level A   — минимум, базовая доступность
Level AA  — рекомендуемый стандарт ← Наша цель
Level AAA — максимальная доступность
```

---

## Семантический HTML

### Правильная структура

```typescript
// ✅ Семантический HTML
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Page Title</h1>
    <section aria-labelledby="section-1">
      <h2 id="section-1">Section Title</h2>
      <p>Content...</p>
    </section>
  </article>
</main>

<aside aria-label="Related content">
  <h2>Related Articles</h2>
</aside>

<footer>
  <p>© 2024 DocConnect</p>
</footer>
```

### Landmark Roles

```typescript
// Автоматические роли через семантические элементы
<header>        // role="banner"
<nav>           // role="navigation"
<main>          // role="main"
<aside>         // role="complementary"
<footer>        // role="contentinfo"
<section>       // role="region" (с aria-label)
<article>       // role="article"
<form>          // role="form"
```

### Heading Hierarchy

```typescript
// ✅ Правильная иерархия
<h1>Page Title</h1>           // Один h1 на страницу
  <h2>Section 1</h2>
    <h3>Subsection 1.1</h3>
    <h3>Subsection 1.2</h3>
  <h2>Section 2</h2>
    <h3>Subsection 2.1</h3>

// ❌ Пропуск уровней
<h1>Title</h1>
<h3>Subsection</h3>  // Пропущен h2!
```

---

## Keyboard Navigation

### Focus Management

```typescript
// Focus visible — всегда видимый фокус
<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  Click me
</button>

// Tailwind config уже включает focus-visible по умолчанию
```

### Tab Order

```typescript
// ✅ Естественный порядок
<form>
  <input name="name" />      {/* 1 */}
  <input name="email" />     {/* 2 */}
  <button type="submit" />   {/* 3 */}
</form>

// ❌ Не используй tabindex > 0
<button tabIndex={2}>Second</button>  // Плохо!

// ✅ tabindex="0" для кастомных интерактивных элементов
<div role="button" tabIndex={0} onClick={handleClick}>
  Custom button
</div>

// ✅ tabindex="-1" для программного фокуса
<div tabIndex={-1} ref={focusRef}>
  Focus programmatically
</div>
```

### Skip Links

```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Skip link — первый элемент */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2"
        >
          Перейти к основному содержимому
        </a>

        <header>{/* navigation */}</header>

        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
```

### Keyboard Shortcuts

```typescript
// Для модальных окон — Escape закрывает
// shadcn Dialog уже это делает

// Для dropdown — стрелки навигация
// shadcn DropdownMenu уже это делает

// Кастомные shortcuts
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    // Ctrl/Cmd + K для поиска
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      openSearch();
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, []);
```

---

## Screen Readers

### ARIA Labels

```typescript
// aria-label — label когда нет видимого текста
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// aria-labelledby — ссылка на видимый label
<section aria-labelledby="services-heading">
  <h2 id="services-heading">Our Services</h2>
</section>

// aria-describedby — дополнительное описание
<input
  id="email"
  aria-describedby="email-help email-error"
/>
<p id="email-help">We'll never share your email</p>
<p id="email-error" role="alert">Invalid email</p>
```

### Screen Reader Only Text

```typescript
// Утилита для скрытия визуально, но доступно для SR
// Tailwind: sr-only

// Icon button с текстом для SR
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
  <span className="sr-only">Settings</span>
</Button>

// Дополнительный контекст для SR
<table>
  <caption className="sr-only">
    Список пользователей с возможностью редактирования
  </caption>
</table>
```

### Live Regions

```typescript
// Анонс изменений для screen readers

// role="alert" — важные сообщения
<div role="alert">
  Ошибка: Неверный пароль
</div>

// role="status" — информационные сообщения
<div role="status" aria-live="polite">
  Данные сохранены
</div>

// aria-live для динамического контента
<div aria-live="polite" aria-atomic="true">
  Найдено {count} результатов
</div>
```

### Accessible Names

```typescript
// Каждый интерактивный элемент должен иметь accessible name

// ✅ Через label
<label htmlFor="name">Name</label>
<input id="name" />

// ✅ Через aria-label
<input aria-label="Search" type="search" />

// ✅ Через aria-labelledby
<h2 id="section-title">Products</h2>
<section aria-labelledby="section-title">...</section>

// ✅ Через видимый текст в button
<button>Submit</button>
```

---

## Color & Contrast

### Contrast Requirements

```
WCAG AA:
- Обычный текст: 4.5:1
- Крупный текст (18px+ или 14px bold): 3:1
- UI компоненты и графика: 3:1

Проверка: https://webaim.org/resources/contrastchecker/
```

### Don't Rely on Color Alone

```typescript
// ❌ Только цвет
<span className="text-red-500">Error</span>

// ✅ Цвет + иконка + текст
<span className="text-destructive flex items-center gap-2">
  <AlertCircle className="h-4 w-4" />
  Error: Invalid email
</span>

// ❌ Только цвет в графике
<div className="w-4 h-4 bg-green-500" /> // Online

// ✅ Цвет + паттерн/иконка
<div className="flex items-center gap-2">
  <div className="w-3 h-3 bg-green-500 rounded-full" />
  <span>Online</span>
</div>
```

### Focus Indicators

```typescript
// Видимый фокус обязателен
<button className="
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
  focus-visible:ring-offset-2
">
  Focused button
</button>
```

---

## Forms

### Labels

```typescript
// Каждый input должен иметь label

// ✅ Явный label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ✅ aria-label для визуально скрытых labels
<input aria-label="Search" type="search" placeholder="Search..." />

// ✅ Placeholder НЕ заменяет label
<div>
  <label htmlFor="phone">Phone</label>
  <input id="phone" placeholder="+7 (999) 123-45-67" />
</div>
```

### Error Messages

```typescript
// Ошибки должны быть связаны с полем
<div>
  <label htmlFor="password">Password</label>
  <input
    id="password"
    type="password"
    aria-invalid={!!error}
    aria-describedby={error ? "password-error" : undefined}
  />
  {error && (
    <p id="password-error" role="alert" className="text-destructive text-sm">
      {error}
    </p>
  )}
</div>
```

### Required Fields

```typescript
// Обозначай обязательные поля
<label htmlFor="name">
  Name <span aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</label>
<input id="name" required aria-required="true" />

// Или в начале формы
<p className="text-sm text-muted-foreground">
  <span aria-hidden="true">*</span> Обязательные поля
</p>
```

### Form Groups

```typescript
// Группировка связанных полей
<fieldset>
  <legend>Контактная информация</legend>
  <div>
    <label htmlFor="phone">Телефон</label>
    <input id="phone" />
  </div>
  <div>
    <label htmlFor="email">Email</label>
    <input id="email" />
  </div>
</fieldset>
```

---

## Images & Media

### Alt Text

```typescript
// Информативные изображения
<Image
  src="/doctor-photo.jpg"
  alt="Доктор Иванов проводит консультацию"
/>

// Декоративные изображения
<Image
  src="/decorative-pattern.svg"
  alt=""
  aria-hidden="true"
/>

// Изображения-ссылки
<Link href="/profile">
  <Image src="/avatar.jpg" alt="Ваш профиль — Иван Иванов" />
</Link>

// Сложные изображения (графики, диаграммы)
<figure>
  <Image src="/chart.png" alt="График роста за 2024 год" />
  <figcaption>
    Детальное описание: В январе — 100, в декабре — 500...
  </figcaption>
</figure>
```

### Video & Audio

```typescript
// Видео с субтитрами
<video controls>
  <source src="/video.mp4" type="video/mp4" />
  <track
    kind="captions"
    src="/captions-ru.vtt"
    srcLang="ru"
    label="Русские субтитры"
    default
  />
</video>

// Аудио с транскрипцией
<audio controls aria-describedby="transcript">
  <source src="/audio.mp3" type="audio/mpeg" />
</audio>
<details id="transcript">
  <summary>Текстовая расшифровка</summary>
  <p>Содержание аудио...</p>
</details>
```

---

## Testing

### Automated Testing

```typescript
// e2e/accessibility/a11y.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicPages = ["/", "/login", "/register", "/search"];

test.describe("Accessibility", () => {
  for (const path of publicPages) {
    test(`${path} has no critical a11y violations`, async ({ page }) => {
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      // Только критичные и серьёзные
      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(critical).toEqual([]);
    });
  }
});
```

### Manual Testing Checklist

```
1. Keyboard Navigation:
   - [ ] Tab через все интерактивные элементы
   - [ ] Enter/Space активируют buttons/links
   - [ ] Escape закрывает modals/dropdowns
   - [ ] Focus видим всегда

2. Screen Reader (VoiceOver/NVDA):
   - [ ] Заголовки читаются в правильном порядке
   - [ ] Формы понятны без визуального контекста
   - [ ] Изображения имеют описание
   - [ ] Ошибки анонсируются

3. Zoom & Resize:
   - [ ] Работает при 200% zoom
   - [ ] Текст не обрезается при увеличении
   - [ ] Нет горизонтального скролла

4. Color:
   - [ ] Контраст достаточный
   - [ ] Информация не только цветом
```

### Tools

```bash
# Browser extensions
- axe DevTools
- WAVE
- Lighthouse

# CLI
npx lighthouse https://example.com --only-categories=accessibility

# VS Code
- axe Accessibility Linter
```

---

## Чеклист

### Структура

- [ ] Один `<h1>` на страницу
- [ ] Правильная иерархия заголовков
- [ ] Семантические HTML элементы
- [ ] Skip link к main content
- [ ] Landmarks (header, nav, main, footer)

### Keyboard

- [ ] Все интерактивные элементы доступны с клавиатуры
- [ ] Логичный tab order
- [ ] Видимый focus indicator
- [ ] Escape закрывает overlays
- [ ] Нет keyboard traps

### Screen Readers

- [ ] Все изображения имеют alt
- [ ] Формы имеют labels
- [ ] Ошибки связаны с полями (aria-describedby)
- [ ] Динамические изменения анонсируются (aria-live)
- [ ] Icon buttons имеют accessible name

### Color & Contrast

- [ ] Текст контраст ≥ 4.5:1
- [ ] UI контраст ≥ 3:1
- [ ] Информация не только цветом
- [ ] Focus индикаторы видимы

### Forms

- [ ] Каждое поле имеет label
- [ ] Обязательные поля обозначены
- [ ] Ошибки понятны и связаны с полями
- [ ] Подсказки доступны (не только placeholder)

### Media

- [ ] Видео с субтитрами
- [ ] Аудио с транскрипцией
- [ ] Нет автовоспроизведения

### Testing

- [ ] axe-core тесты проходят
- [ ] Ручное тестирование с клавиатурой
- [ ] Тестирование со screen reader
- [ ] Проверка при 200% zoom

---

_См. также:_

- [Design System](./design-system.md)
- [Components](./components.md)
- [Testing Guide](../guides/testing.md)
