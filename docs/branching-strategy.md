# Branching Strategy

Trunk-Based Development workflow для проекта DocConnect.

---

## Основные принципы

```
main ──────●────●────●────●────●────●────●────────────▶
           │    │    │    │    │    │    │
           │    │    │    │    │    │    └─ feat/notifications
           │    │    │    │    │    └────── fix/login-redirect
           │    │    │    │    └─────────── feat/booking-flow
           │    │    │    └──────────────── chore/deps-update
           │    │    └───────────────────── feat/search-filters
           │    └────────────────────────── fix/validation
           └─────────────────────────────── feat/dashboard
```

### Правила

1. **`main` — всегда deployable**
   - Protected branch
   - Автоматический deploy на Vercel при merge

2. **Feature branches — короткоживущие**
   - Максимальная жизнь: 2-3 дня
   - Чем меньше изменений — тем лучше

3. **Squash merge**
   - Один коммит на один PR
   - Чистая история main

4. **Preview deployments**
   - Vercel создаёт preview для каждого PR
   - Тестируйте перед merge

---

## Naming Conventions

### Формат

```
<type>/<short-description>
```

### Types

| Type     | Использование            | Пример                  |
| -------- | ------------------------ | ----------------------- |
| `feat/`  | Новая функциональность   | `feat/booking-calendar` |
| `fix/`   | Исправление бага         | `fix/login-validation`  |
| `chore/` | Рефакторинг, зависимости | `chore/update-deps`     |
| `docs/`  | Документация             | `docs/api-reference`    |
| `test/`  | Тесты                    | `test/e2e-booking-flow` |
| `perf/`  | Оптимизация              | `perf/image-loading`    |

### Примеры

```bash
# Хорошо
feat/user-profile-page
fix/appointment-timezone
chore/eslint-config
docs/setup-guide

# Плохо
feature-1
my-branch
test
fix
```

---

## Git Workflow

### 1. Создание ветки

```bash
# Убедитесь, что main актуален
git checkout main
git pull origin main

# Создайте ветку
git checkout -b feat/my-feature
```

### 2. Работа в ветке

```bash
# Атомарные коммиты
git add -p  # Интерактивный staging
git commit -m "feat: add user avatar upload"

# Регулярный rebase с main
git fetch origin
git rebase origin/main
```

### 3. Push и PR

```bash
# Push ветки
git push -u origin feat/my-feature

# Создайте PR через GitHub CLI или UI
gh pr create --title "feat: add user avatar upload" --body "..."
```

### 4. После review

```bash
# Если нужны изменения
git add .
git commit --amend  # Или новый коммит
git push --force-with-lease

# После approve — Squash and Merge через GitHub UI
```

### 5. Cleanup

```bash
# После merge ветка удаляется автоматически
# Локально:
git checkout main
git pull
git branch -d feat/my-feature
```

---

## Branch Protection Rules

### Настройки для `main`

| Правило                   | Значение                     |
| ------------------------- | ---------------------------- |
| Require PR review         | 1 approver                   |
| Require status checks     | lint, typecheck, test, build |
| Require branch up-to-date | Yes                          |
| Require signed commits    | Optional                     |
| Auto-delete branches      | Yes                          |
| Allow force push          | No                           |
| Allow deletions           | No                           |

### Как настроить

1. GitHub → Settings → Branches → Add branch protection rule
2. Branch name pattern: `main`
3. Включите:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Automatically delete head branches
4. Status checks:
   - `lint`
   - `typecheck`
   - `test`
   - `build`
   - `e2e` (опционально)

---

## Commit Messages

### Format

```
<type>: <short description>

[optional body]

[optional footer]
```

### Types

| Type       | Описание                          |
| ---------- | --------------------------------- |
| `feat`     | Новая функциональность            |
| `fix`      | Исправление бага                  |
| `docs`     | Документация                      |
| `style`    | Форматирование (не влияет на код) |
| `refactor` | Рефакторинг                       |
| `perf`     | Оптимизация                       |
| `test`     | Тесты                             |
| `chore`    | Прочее (deps, config)             |

### Примеры

```bash
# Хорошо
feat: add Google OAuth login
fix: correct timezone handling in appointments
docs: update API documentation
chore: upgrade Next.js to 16.1

# С body
feat: add appointment reminder emails

- Send email 24h before appointment
- Include calendar attachment
- Support HTML and plain text

Closes #123

# Плохо
fix bug
update
WIP
asdf
```

---

## Release Strategy

### Semantic Versioning

```
MAJOR.MINOR.PATCH

1.0.0 — Initial release
1.1.0 — New features (backward compatible)
1.1.1 — Bug fixes
2.0.0 — Breaking changes
```

### Release Process

1. **Prepare release**

   ```bash
   # Убедитесь, что main стабилен
   git checkout main
   git pull
   npm run test
   npm run build
   ```

2. **Create release**

   ```bash
   # Через GitHub Releases UI или:
   gh release create v1.2.0 --generate-notes
   ```

3. **Tag format**
   ```
   v1.0.0
   v1.1.0-beta.1
   v2.0.0-rc.1
   ```

---

## Hotfix Process

Для критических багов в production:

```bash
# 1. Создайте ветку от main
git checkout main
git pull
git checkout -b fix/critical-auth-bug

# 2. Исправьте баг
# ...

# 3. Создайте PR с пометкой [HOTFIX]
gh pr create --title "[HOTFIX] fix: critical auth bypass" --body "..."

# 4. После review — немедленный merge
# 5. Создайте patch release
gh release create v1.2.1 --notes "Hotfix: critical auth bypass"
```

---

## FAQ

### Q: Когда делать rebase vs merge?

**Rebase** — для обновления feature branch с main:

```bash
git rebase origin/main
```

**Merge** — никогда вручную. Используйте Squash Merge через GitHub UI.

### Q: Что делать при конфликтах?

```bash
# При rebase
git rebase origin/main
# Если конфликты:
# 1. Исправьте конфликты
git add .
git rebase --continue
# 2. Push с force
git push --force-with-lease
```

### Q: Как откатить merge?

```bash
# Через GitHub UI: Revert PR
# Или вручную:
git revert -m 1 <merge-commit-sha>
git push
```

### Q: Нужен ли CHANGELOG?

Да, автоматически через GitHub Releases:

- Используйте conventional commits
- GitHub генерирует release notes

---

_Последнее обновление: Февраль 2026_
