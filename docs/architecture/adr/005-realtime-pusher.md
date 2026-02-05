# ADR-005: Real-time — Pusher

**Статус:** Accepted

**Дата:** 2026-01-30

**Авторы:** @mrnvch

---

## Контекст

Нужна система real-time коммуникации для мессенджера.

**Требования:**

- Real-time сообщения между пациентами и провайдерами
- Typing indicators
- Presence (online/offline)
- File attachments (через Storage)
- Масштабируемость

**Use Cases:**

- Чат между пациентом и провайдером
- Уведомления о новых сообщениях
- Typing indicators
- Read receipts

---

## Рассмотренные варианты

### Вариант 1: Pusher

**Описание:**
Managed WebSocket service.

**Плюсы:**

- Простая интеграция
- Presence channels
- Client Events (typing)
- Щедрый free tier (200K messages/day)
- Отличная документация
- SDK для всех платформ

**Минусы:**

- Vendor lock-in
- При масштабировании дорого
- Нет persistence (нужна своя БД)

### Вариант 2: Ably

**Описание:**
Enterprise realtime platform.

**Плюсы:**

- Message persistence
- Более надёжный SLA
- History API

**Минусы:**

- Дороже
- Сложнее API
- Overkill для наших нужд

### Вариант 3: Socket.io + Custom Server

**Описание:**
Self-hosted WebSocket сервер.

**Плюсы:**

- Полный контроль
- Нет vendor lock-in
- Дешевле при масштабе

**Минусы:**

- Нужен отдельный сервер
- Сложнее scaling
- DevOps overhead

### Вариант 4: Supabase Realtime

**Описание:**
PostgreSQL изменения через WebSocket.

**Плюсы:**

- Уже используем Supabase
- Database-driven
- Бесплатно в составе плана

**Минусы:**

- Привязан к структуре БД
- Меньше гибкости
- Нет typing indicators из коробки

---

## Решение

Выбран **Pusher** потому что:

1. **Простота интеграции** — минимум кода
2. **Free tier** — 200K messages/day достаточно для MVP
3. **Presence Channels** — online/offline статусы
4. **Client Events** — typing indicators без сервера
5. **Надёжность** — проверенный сервис

---

## Архитектура

### Структура

```
src/lib/
├── pusher.ts           # Server-side Pusher client
└── pusher-client.ts    # Client-side hooks

src/server/actions/
└── messages.ts         # Message actions with Pusher triggers
```

### Channel Naming

```typescript
// Private channels для thread'ов
`private-thread-${threadId}`
// Presence channels для online status
`presence-user-${userId}`;
```

### Server-side

```typescript
// src/lib/pusher.ts
import Pusher from "pusher";

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// При отправке сообщения
await pusher.trigger(`private-thread-${threadId}`, "new-message", {
  id: message.id,
  content: message.content,
  senderId: userId,
  createdAt: message.createdAt,
});
```

### Client-side

```typescript
// src/lib/pusher-client.ts
"use client";

import Pusher from "pusher-js";

export function usePusher() {
  const pusher = useMemo(() => {
    return new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }, []);

  return pusher;
}

export function useChannel(channelName: string) {
  const pusher = usePusher();
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const ch = pusher.subscribe(channelName);
    setChannel(ch);
    return () => pusher.unsubscribe(channelName);
  }, [pusher, channelName]);

  return channel;
}
```

### Events

| Event          | Описание                       |
| -------------- | ------------------------------ |
| `new-message`  | Новое сообщение в thread       |
| `message-read` | Сообщение прочитано            |
| `typing-start` | Пользователь начал печатать    |
| `typing-stop`  | Пользователь перестал печатать |

---

## Typing Indicators

```typescript
// Client Events (не проходят через сервер)
channel.trigger("client-typing-start", { userId });

// Auto-stop after 3 seconds
setTimeout(() => {
  channel.trigger("client-typing-stop", { userId });
}, 3000);
```

---

## Безопасность

### Private Channel Auth

```typescript
// src/app/api/pusher/auth/route.ts
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { socket_id, channel_name } = await request.json();

  // Проверка доступа к channel
  const threadId = channel_name.replace("private-thread-", "");
  const hasAccess = await checkThreadAccess(session.user.id, threadId);

  if (!hasAccess) return new Response("Forbidden", { status: 403 });

  const authResponse = pusher.authorizeChannel(socket_id, channel_name);
  return Response.json(authResponse);
}
```

---

## Последствия

### Положительные

- Быстрая интеграция
- Надёжная доставка
- Typing indicators работают

### Отрицательные

- При масштабировании потребуется платный план
- Зависимость от third-party

### Риски

- **Риск:** Pusher downtime
  - **Митигация:** Fallback на polling, сообщения сохраняются в БД

- **Риск:** Rate limits
  - **Митигация:** Мониторинг usage, upgrade при необходимости

---

## Ссылки

- [Pusher Docs](https://pusher.com/docs)
- [Pusher Channels](https://pusher.com/docs/channels)
- [Private Channels](https://pusher.com/docs/channels/using_channels/private-channels)
