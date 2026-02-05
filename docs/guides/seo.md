# SEO Guide

Руководство по SEO оптимизации в проекте DocConnect.

---

## Содержание

1. [Metadata API](#metadata-api)
2. [Structured Data](#structured-data)
3. [Sitemap & Robots](#sitemap--robots)
4. [Performance & Core Web Vitals](#performance--core-web-vitals)
5. [URL Structure](#url-structure)
6. [Content Optimization](#content-optimization)
7. [International SEO](#international-seo)
8. [Monitoring](#monitoring)
9. [Чеклист](#чеклист)

---

## Metadata API

### Static Metadata

```typescript
// src/app/page.tsx
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "DocConnect — Найдите лучшего врача",
  description: "Сервис онлайн-записи к врачам. Более 10,000 специалистов в вашем городе.",
  keywords: ["запись к врачу", "онлайн консультация", "медицинский сервис"],
  authors: [{ name: "DocConnect" }],
  creator: "DocConnect",
  publisher: "DocConnect",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://docconnect.ru",
    siteName: "DocConnect",
    title: "DocConnect — Найдите лучшего врача",
    description: "Сервис онлайн-записи к врачам",
    images: [
      {
        url: "https://docconnect.ru/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "DocConnect",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocConnect — Найдите лучшего врача",
    description: "Сервис онлайн-записи к врачам",
    images: ["https://docconnect.ru/twitter-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
  },
};
```

### Dynamic Metadata

```typescript
// src/app/doctors/[slug]/page.tsx
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await prisma.doctor.findUnique({
    where: { slug },
    include: { specialty: true },
  });

  if (!doctor) return {};

  return {
    title: `${doctor.name} — ${doctor.specialty.name} | DocConnect`,
    description: `${doctor.name}. ${doctor.specialty.name} с опытом ${doctor.experience} лет. Записаться онлайн на DocConnect.`,
    openGraph: {
      title: doctor.name,
      description: doctor.bio?.slice(0, 160),
      images: doctor.image ? [{ url: doctor.image }] : [],
    },
    alternates: {
      canonical: `https://docconnect.ru/doctors/${slug}`,
    },
  };
}

export default async function DoctorPage({ params }: Props) {
  // ...
}
```

### Base Metadata Template

```typescript
// src/app/layout.tsx
import { type Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://docconnect.ru"),
  title: {
    default: "DocConnect — Сервис записи к врачам",
    template: "%s | DocConnect", // Используется в children pages
  },
  description: "Сервис онлайн-записи к врачам",
};
```

---

## Structured Data

### JSON-LD Component

```typescript
// src/components/seo/json-ld.tsx
interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

### Organization Schema

```typescript
// src/app/layout.tsx
import { JsonLd } from "@/components/seo/json-ld";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DocConnect",
  url: "https://docconnect.ru",
  logo: "https://docconnect.ru/logo.png",
  sameAs: [
    "https://t.me/docconnect",
    "https://vk.com/docconnect",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+7-800-123-45-67",
    contactType: "customer service",
    availableLanguage: ["Russian"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <JsonLd data={organizationSchema} />
        {children}
      </body>
    </html>
  );
}
```

### Doctor/Physician Schema

```typescript
// src/app/doctors/[slug]/page.tsx
const doctorSchema = {
  "@context": "https://schema.org",
  "@type": "Physician",
  name: doctor.name,
  image: doctor.image,
  description: doctor.bio,
  medicalSpecialty: doctor.specialty.name,
  address: {
    "@type": "PostalAddress",
    addressLocality: doctor.city,
    addressCountry: "RU",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: doctor.rating,
    reviewCount: doctor.reviewsCount,
  },
  priceRange: `от ${doctor.minPrice} ₽`,
};

export default function DoctorPage() {
  return (
    <>
      <JsonLd data={doctorSchema} />
      {/* ... */}
    </>
  );
}
```

### Breadcrumbs Schema

```typescript
// src/components/seo/breadcrumbs-schema.tsx
interface Breadcrumb {
  name: string;
  url: string;
}

export function BreadcrumbsSchema({ items }: { items: Breadcrumb[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={schema} />;
}
```

### FAQ Schema

```typescript
// src/app/faq/page.tsx
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};
```

---

## Sitemap & Robots

### Dynamic Sitemap

```typescript
// src/app/sitemap.ts
import { type MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://docconnect.ru";

  // Static pages
  const staticPages = ["", "/about", "/pricing", "/contact", "/faq"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Dynamic pages: doctors
  const doctors = await prisma.doctor.findMany({
    select: { slug: true, updatedAt: true },
  });

  const doctorPages = doctors.map((doctor) => ({
    url: `${baseUrl}/doctors/${doctor.slug}`,
    lastModified: doctor.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic pages: specialties
  const specialties = await prisma.specialty.findMany({
    select: { slug: true },
  });

  const specialtyPages = specialties.map((specialty) => ({
    url: `${baseUrl}/specialties/${specialty.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...doctorPages, ...specialtyPages];
}
```

### Robots.txt

```typescript
// src/app/robots.ts
import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://docconnect.ru";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/profile/", "/admin/", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

---

## Performance & Core Web Vitals

### SEO Impact

```
Google учитывает Core Web Vitals как ranking factor:

LCP < 2.5s  → Хорошо для SEO
INP < 200ms → Хорошо для SEO
CLS < 0.1   → Хорошо для SEO
```

### Optimizations

```typescript
// 1. Fonts — next/font для избежания CLS
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin", "cyrillic"] });

// 2. Images — next/image с размерами
<Image
  src="/hero.jpg"
  width={1200}
  height={600}
  alt="Описательный alt текст"
  priority // LCP image
/>

// 3. Lazy loading для below-fold content
const HeavySection = dynamic(() => import("./heavy-section"), {
  loading: () => <Skeleton />,
});
```

---

## URL Structure

### Best Practices

```
✅ Хорошие URL:
/doctors/ivan-petrov
/specialties/therapist
/cities/moscow/doctors
/blog/how-to-choose-doctor

❌ Плохие URL:
/doctors?id=123
/page.php?cat=1&id=5
/врачи/иван-петров (кириллица)
```

### Route Structure

```typescript
// Next.js App Router
src/app/
├── page.tsx                        // /
├── about/page.tsx                  // /about
├── doctors/
│   ├── page.tsx                    // /doctors
│   └── [slug]/page.tsx             // /doctors/ivan-petrov
├── specialties/
│   ├── page.tsx                    // /specialties
│   └── [slug]/
│       ├── page.tsx                // /specialties/therapist
│       └── [city]/page.tsx         // /specialties/therapist/moscow
└── blog/
    ├── page.tsx                    // /blog
    └── [slug]/page.tsx             // /blog/article-slug
```

### Canonical URLs

```typescript
// Всегда указывай canonical URL
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    alternates: {
      canonical: `https://docconnect.ru/doctors/${params.slug}`,
    },
  };
}
```

---

## Content Optimization

### Headings Structure

```typescript
// Правильная иерархия заголовков
export default function DoctorPage({ doctor }) {
  return (
    <article>
      <h1>{doctor.name}</h1>                    {/* Только один H1 */}

      <section>
        <h2>О специалисте</h2>
        <p>{doctor.bio}</p>
      </section>

      <section>
        <h2>Услуги и цены</h2>
        <h3>Консультации</h3>
        <h3>Диагностика</h3>
      </section>

      <section>
        <h2>Отзывы пациентов</h2>
        {/* ... */}
      </section>
    </article>
  );
}
```

### Alt Texts

```typescript
// ✅ Описательный alt
<Image
  src={doctor.image}
  alt={`Фото врача ${doctor.name}, ${doctor.specialty.name}`}
/>

// ❌ Плохой alt
<Image src={doctor.image} alt="photo" />
<Image src={doctor.image} alt="" />
```

### Internal Linking

```typescript
// Связывай страницы между собой
export default function DoctorPage({ doctor }) {
  return (
    <>
      <p>
        <Link href={`/specialties/${doctor.specialty.slug}`}>
          {doctor.specialty.name}
        </Link>
        в городе{" "}
        <Link href={`/cities/${doctor.city.slug}`}>
          {doctor.city.name}
        </Link>
      </p>

      <section>
        <h2>Похожие специалисты</h2>
        {relatedDoctors.map((d) => (
          <Link key={d.id} href={`/doctors/${d.slug}`}>
            {d.name}
          </Link>
        ))}
      </section>
    </>
  );
}
```

---

## International SEO

### Locale Configuration

```typescript
// src/app/[locale]/layout.tsx
import { type Metadata } from "next";

export function generateStaticParams() {
  return [{ locale: "ru" }, { locale: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: {
      canonical: `https://docconnect.ru/${locale}`,
      languages: {
        ru: "https://docconnect.ru/ru",
        en: "https://docconnect.ru/en",
        "x-default": "https://docconnect.ru",
      },
    },
  };
}
```

### Hreflang Tags

```typescript
// Автоматически через alternates.languages
// Или вручную в head
<link rel="alternate" hreflang="ru" href="https://docconnect.ru/ru/page" />
<link rel="alternate" hreflang="en" href="https://docconnect.ru/en/page" />
<link rel="alternate" hreflang="x-default" href="https://docconnect.ru/page" />
```

---

## Monitoring

### Google Search Console

1. Добавь сайт в Search Console
2. Подтверди владение через DNS или HTML тег
3. Отслеживай:
   - Покрытие индекса
   - Core Web Vitals
   - Ошибки сканирования
   - Позиции по ключевым запросам

### Structured Data Testing

```bash
# Проверка schema.org
https://validator.schema.org/

# Rich Results Test
https://search.google.com/test/rich-results
```

### Analytics Setup

```typescript
// src/app/layout.tsx
import { GoogleAnalytics } from "@next/third-parties/google";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <GoogleAnalytics gaId="G-XXXXXXXXXX" />
      </body>
    </html>
  );
}
```

---

## Чеклист

### Metadata

- [ ] Title уникален для каждой страницы (50-60 символов)
- [ ] Description уникален (150-160 символов)
- [ ] Open Graph настроен
- [ ] Twitter Cards настроены
- [ ] Canonical URL указан

### Structured Data

- [ ] Organization schema на главной
- [ ] Breadcrumbs на внутренних страницах
- [ ] Product/Service schema где применимо
- [ ] FAQ schema на странице FAQ
- [ ] Проверено в Rich Results Test

### Technical

- [ ] sitemap.xml генерируется динамически
- [ ] robots.txt настроен
- [ ] Нет noindex на важных страницах
- [ ] HTTPS везде
- [ ] Core Web Vitals в зелёной зоне

### Content

- [ ] Один H1 на страницу
- [ ] Правильная иерархия H1-H6
- [ ] Alt тексты на всех изображениях
- [ ] Внутренняя перелинковка
- [ ] Нет дублирующегося контента

### URLs

- [ ] ЧПУ (человекопонятные URL)
- [ ] Нет параметров где возможно
- [ ] Canonical на всех страницах
- [ ] 301 редиректы для старых URL

### Monitoring

- [ ] Google Search Console подключен
- [ ] Google Analytics настроен
- [ ] Позиции отслеживаются
- [ ] Core Web Vitals мониторятся

---

_См. также:_

- [Performance Guide](./performance.md)
- [Frontend Guide](./frontend.md)
- [Architecture Overview](../architecture/overview.md)
