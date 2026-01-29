# SEO-оптимизация

## Описание
Улучшить SEO для лучшего ранжирования в поисковых системах.

## Требования

### Metadata
- [ ] Динамические title и description для каждой страницы
- [ ] Open Graph теги
- [ ] Twitter Card теги
- [ ] Canonical URLs

### Структурированные данные
- [ ] JSON-LD для детских садов (LocalBusiness schema)
- [ ] JSON-LD для отзывов (Review schema)
- [ ] Breadcrumbs schema

### Технические улучшения
- [ ] Sitemap.xml (динамический)
- [ ] Robots.txt
- [ ] Оптимизация изображений (next/image)
- [ ] Lazy loading

### Реализация

```typescript
// src/app/daycare/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const daycare = await getDaycare(params.slug);
  return {
    title: `${daycare.name} - KinderCare`,
    description: daycare.description,
    openGraph: {
      title: daycare.name,
      images: [daycare.photos[0]?.url],
    },
  };
}
```

```typescript
// src/app/sitemap.ts
export default async function sitemap() {
  const daycares = await getAllDaycares();
  return daycares.map(d => ({
    url: `https://kindercare.com/daycare/${d.slug}`,
    lastModified: d.updatedAt,
  }));
}
```

## Критерии готовности
- Все страницы имеют уникальные meta-теги
- Sitemap генерируется автоматически
- Структурированные данные валидны
