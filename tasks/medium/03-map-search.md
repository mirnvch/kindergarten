# Поиск на карте

## Описание
Интегрировать Mapbox для отображения детских садов на карте.

## Требования

### Функциональность
- [ ] Карта с маркерами садов
- [ ] Кластеризация маркеров
- [ ] Popup с информацией о саде
- [ ] Геолокация пользователя
- [ ] Поиск по адресу (geocoding)
- [ ] Фильтрация по радиусу от точки

### Компоненты
```typescript
// src/components/search/DaycareMap.tsx
- MapContainer
- DaycareMarker
- DaycarePopup
- LocationSearch
```

### Страницы
- Добавить карту на `/search` (toggle list/map view)
- Карта на странице `/daycare/[slug]` с локацией

### Mapbox интеграция
```typescript
// src/lib/mapbox.ts
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Geocoding API
export async function geocodeAddress(address: string) { ... }

// Reverse geocoding
export async function reverseGeocode(lat: number, lng: number) { ... }
```

### Server Actions
```typescript
// Обновить searchDaycares() для поддержки:
- coordinates (lat, lng)
- radius (km)
- boundingBox (для viewport)
```

## Критерии готовности
- Сады отображаются на карте в результатах поиска
- Можно искать по адресу
- Можно фильтровать по расстоянию
- На странице сада показана его локация
