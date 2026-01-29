# Knowledge Base

Доменные знания проекта KinderCare — факты, правила, инсайты.

## Принципы

| Принцип | Почему |
|---------|--------|
| **Git is the database** | Факты версионируются, ревьюятся, мержатся |
| **JSONL format** | Append-only, без merge-конфликтов |
| **Hash-based IDs** | Нет коллизий между сессиями |
| **Query-based provenance** | `learned_from` хранит запрос, не ID теста |

## Структура

```
knowledge/
├── facts.jsonl      # Источник истины (git-tracked)
├── config.yaml      # Таксономия топиков
├── .gitignore       # Игнорирует *.db кэш
└── scripts/
    └── knowledge.sh # CLI
```

## Использование

```bash
# Список фактов
./scripts/knowledge.sh list

# Поиск по топику
./scripts/knowledge.sh search --topic=age

# Поиск по слову
./scripts/knowledge.sh search rating

# Контекст для промпта
./scripts/knowledge.sh search --topic=stripe --format=context

# Детали факта
./scripts/knowledge.sh get FACT-a1b2c3d4

# Добавить факт
./scripts/knowledge.sh add
```

## Схема факта

```json
{
  "id": "FACT-a1b2c3d4",
  "status": "active",
  "topics": ["age", "eligibility"],
  "assertion": "Что истинно",
  "guidance": "Как использовать",
  "evidence": "Откуда знаем",
  "learned_from": "Запрос/контекст"
}
```

## Топики

См. `config.yaml` — age, pricing, booking, enrollment, reviews, stripe, users, search.
