# Setup

Руководства по настройке окружения разработки DocConnect.

---

## Документы

| Документ                                  | Описание                                   |
| ----------------------------------------- | ------------------------------------------ |
| [Getting Started](./getting-started.md)   | Быстрый старт — от клонирования до запуска |
| [Environment Variables](./environment.md) | Полное описание всех переменных окружения  |

---

## Быстрый старт (5 минут)

```bash
# 1. Клонируйте репозиторий
git clone git@github.com:your-org/docconnect.git
cd docconnect

# 2. Установите зависимости
npm install

# 3. Скопируйте .env.example и заполните
cp .env.example .env

# 4. Примените схему БД
npx prisma db push

# 5. Запустите dev server
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

---

## Минимальные переменные окружения

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="your-secret-32-chars"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Проблемы?

См. раздел [Troubleshooting](./getting-started.md#troubleshooting) в Getting Started.

---

_Следующий шаг: [Architecture Overview](../architecture/overview.md)_
