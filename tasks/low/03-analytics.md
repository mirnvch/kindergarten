# Аналитика и отчёты

## Описание
Добавить аналитику для владельцев садов и платформы.

## Требования

### Для владельцев садов
- [ ] Просмотры профиля
- [ ] Количество бронирований
- [ ] Конверсия (просмотры → бронирования)
- [ ] Источники трафика
- [ ] Популярные дни/время

### Для платформы (admin)
- [ ] Общее количество пользователей
- [ ] Рост по дням/неделям/месяцам
- [ ] Топ садов по бронированиям
- [ ] Выручка и комиссии
- [ ] Retention пользователей

### Компоненты
```typescript
// src/components/portal/AnalyticsDashboard.tsx
// src/components/portal/ViewsChart.tsx
// src/components/portal/BookingsChart.tsx
// src/components/admin/PlatformMetrics.tsx
```

### Реализация
- Использовать библиотеку для графиков (Recharts)
- Server Actions для агрегации данных
- Кэширование отчётов

### Database
Добавить таблицу для событий аналитики:
```prisma
model AnalyticsEvent {
  id        String   @id @default(cuid())
  type      String   // page_view, booking_started, etc.
  daycareId String?
  userId    String?
  metadata  Json?
  createdAt DateTime @default(now())
}
```

## Критерии готовности
- Владелец видит статистику своего сада
- Графики отображают данные корректно
- Админ видит метрики платформы
