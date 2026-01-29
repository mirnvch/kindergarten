# Загрузка фотографий

## Описание
Реализовать загрузку фотографий детских садов через Uploadthing (уже сконфигурирован).

## Требования

### Функциональность
- [ ] Загрузка множества фото (до 10)
- [ ] Превью перед загрузкой
- [ ] Прогресс загрузки
- [ ] Удаление фото
- [ ] Установка главного фото
- [ ] Drag & drop сортировка

### Ограничения
- Максимум 10 фото на сад
- Максимум 5MB на файл
- Форматы: JPEG, PNG, WebP
- Автоматическое сжатие

### Компоненты
```typescript
// src/components/portal/PhotoUploader.tsx
- DropZone для drag & drop
- PhotoGrid для отображения
- PhotoPreview для превью
```

### Server Actions
```typescript
// src/server/actions/photos.ts
uploadPhotos()
deletePhoto()
reorderPhotos()
setMainPhoto()
```

### Интеграция Uploadthing
```typescript
// src/lib/uploadthing.ts
import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  daycarePhoto: f({ image: { maxFileSize: "5MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => { ... })
    .onUploadComplete(async ({ file }) => { ... }),
};
```

## Критерии готовности
- Владелец может загружать фото через портал
- Фото отображаются в галерее на странице сада
- Работает удаление и сортировка
