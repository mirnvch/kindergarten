# Центр уведомлений

## Описание
Создать in-app систему уведомлений.

## Требования

### Типы уведомлений
- Новое бронирование
- Подтверждение бронирования
- Новое сообщение
- Новый отзыв
- Место в очереди
- Системные уведомления

### UI компоненты
- [ ] Иконка колокольчика в header
- [ ] Dropdown со списком уведомлений
- [ ] Badge с количеством непрочитанных
- [ ] Страница `/notifications` со всеми уведомлениями

### Функциональность
- [ ] Отметка как прочитанное
- [ ] Отметить все как прочитанные
- [ ] Удаление уведомлений
- [ ] Настройки типов уведомлений

### Компоненты
```typescript
// src/components/layout/NotificationBell.tsx
// src/components/notifications/NotificationList.tsx
// src/components/notifications/NotificationItem.tsx
// src/components/notifications/NotificationSettings.tsx
```

### Server Actions
```typescript
// src/server/actions/notifications.ts
getNotifications()
markAsRead()
markAllAsRead()
deleteNotification()
updateNotificationSettings()
createNotification() // internal
```

### Database
Модель `Notification` уже существует в schema.prisma

## Критерии готовности
- Уведомления отображаются в header
- Можно отмечать как прочитанные
- Настройки уведомлений работают
