# Payload CMS Patterns

## Pourquoi Payload CMS 3

| Critère | Payload CMS 3 | Alternatives |
|---|---|---|
| **Intégration Next.js** | Natif — vit DANS le projet Next.js | Strapi/Directus = serveur séparé |
| **Base de données** | SQLite (dev) / PostgreSQL (prod) | Strapi = PostgreSQL obligatoire |
| **Admin UI** | Incluse, auto-générée | Équivalent |
| **Typage** | TypeScript natif | Génération de types |
| **Coût** | Open source, gratuit | Sanity = payant au-delà du free tier |
| **Portabilité** | Le CMS fait partie du repo | 2 serveurs sinon |
| **Live Preview** | Officiel, intégré | À implémenter |

---

## Structure type d'un site généré

```
site-{projectId}/
├── payload.config.ts             # Configuration Payload
├── src/
│   ├── app/
│   │   ├── (frontend)/           # Pages publiques
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Homepage
│   │   │   └── [slug]/page.tsx   # Pages dynamiques
│   │   └── (payload)/            # Admin CMS
│   │       └── admin/
│   │           └── [[...segments]]/page.tsx
│   ├── collections/              # Schémas Payload
│   │   ├── Pages.ts
│   │   ├── Navigation.ts
│   │   ├── Media.ts
│   │   ├── Forms.ts
│   │   └── FormSubmissions.ts
│   ├── blocks/                   # Blocks pour les sections
│   │   ├── Hero.ts
│   │   ├── Features.ts
│   │   ├── Testimonials.ts
│   │   └── ...
│   └── components/
│       └── sections/             # Composants React des sections
│           ├── Hero.tsx
│           ├── Features.tsx
│           └── ...
└── data/
    └── site.db                   # SQLite (dev/preview)
```

---

## Collection Pages

La collection centrale qui gère toutes les pages du site :

```typescript
// src/collections/Pages.ts
import { CollectionConfig } from 'payload'
import { HeroBlock } from '@/blocks/Hero'
import { FeaturesBlock } from '@/blocks/Features'
import { TestimonialsBlock } from '@/blocks/Testimonials'
import { CTABlock } from '@/blocks/CTA'
import { FAQBlock } from '@/blocks/FAQ'
import { ContactBlock } from '@/blocks/Contact'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    livePreview: {
      url: ({ data }) => {
        const path = data.slug === 'home' ? '' : data.slug
        return `${process.env.NEXT_PUBLIC_SITE_URL}/${path}`
      },
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'sections',
      type: 'blocks',
      blocks: [
        HeroBlock,
        FeaturesBlock,
        TestimonialsBlock,
        CTABlock,
        FAQBlock,
        ContactBlock,
      ],
    },
  ],
}
```

---

## Blocks (Sections)

Chaque type de section est un Block Payload :

```typescript
// src/blocks/Hero.ts
import { Block } from 'payload'

export const HeroBlock: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero',
    plural: 'Heroes',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'subheading',
      type: 'textarea',
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'cta',
      type: 'group',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'link', type: 'text' },
        {
          name: 'variant',
          type: 'select',
          options: ['primary', 'secondary', 'outline'],
          defaultValue: 'primary',
        },
      ],
    },
    {
      name: 'alignment',
      type: 'select',
      options: ['left', 'center', 'right'],
      defaultValue: 'center',
    },
  ],
}
```

---

## Collection Navigation

```typescript
// src/collections/Navigation.ts
import { CollectionConfig } from 'payload'

export const Navigation: CollectionConfig = {
  slug: 'navigation',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true, // 'header', 'footer', 'mobile'
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'link', type: 'text', required: true },
        {
          name: 'children',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'link', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
}
```

---

## Collection Media

```typescript
// src/collections/Media.ts
import { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'public/media',
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300 },
      { name: 'card', width: 768, height: 512 },
      { name: 'hero', width: 1920, height: 1080 },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
  ],
}
```

---

## Rendu SSR des pages

```tsx
// src/app/(frontend)/[slug]/page.tsx
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { SectionRenderer } from '@/components/SectionRenderer'

interface PageProps {
  params: { slug: string }
}

export default async function Page({ params }: PageProps) {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: params.slug } },
  })

  if (!result.docs.length) {
    notFound()
  }

  const page = result.docs[0]

  return (
    <main>
      {page.sections?.map((section, index) => (
        <SectionRenderer key={index} section={section} />
      ))}
    </main>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: params.slug } },
  })

  if (!result.docs.length) return {}

  const page = result.docs[0]
  return {
    title: page.meta?.title || page.title,
    description: page.meta?.description,
    openGraph: {
      images: page.meta?.image ? [page.meta.image.url] : [],
    },
  }
}

export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const pages = await payload.find({ collection: 'pages' })

  return pages.docs.map((page) => ({
    slug: page.slug,
  }))
}
```

---

## SectionRenderer

```tsx
// src/components/SectionRenderer.tsx
import { HeroSection } from './sections/Hero'
import { FeaturesSection } from './sections/Features'
import { TestimonialsSection } from './sections/Testimonials'
import { CTASection } from './sections/CTA'
import { FAQSection } from './sections/FAQ'
import { ContactSection } from './sections/Contact'

const sectionComponents = {
  hero: HeroSection,
  features: FeaturesSection,
  testimonials: TestimonialsSection,
  cta: CTASection,
  faq: FAQSection,
  contact: ContactSection,
}

interface SectionRendererProps {
  section: {
    blockType: keyof typeof sectionComponents
    [key: string]: any
  }
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const Component = sectionComponents[section.blockType]

  if (!Component) {
    console.warn(`Unknown section type: ${section.blockType}`)
    return null
  }

  return <Component {...section} />
}
```

---

## Live Preview

Configuration dans `payload.config.ts` :

```typescript
import { buildConfig } from 'payload'
import { Pages } from './collections/Pages'
import { Media } from './collections/Media'
import { Navigation } from './collections/Navigation'

export default buildConfig({
  collections: [Pages, Media, Navigation],
  admin: {
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
})
```

Côté frontend, ajouter le listener :

```tsx
// src/components/LivePreviewListener.tsx
'use client'
import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'

export function LivePreviewListener() {
  return (
    <RefreshRouteOnSave
      serverURL={process.env.NEXT_PUBLIC_PAYLOAD_URL!}
    />
  )
}
```

---

## Storage S3 (MinIO)

```typescript
// payload.config.ts
import { s3Storage } from '@payloadcms/storage-s3'

export default buildConfig({
  // ...
  plugins: [
    s3Storage({
      collections: { media: true },
      bucket: process.env.MINIO_BUCKET!,
      config: {
        endpoint: process.env.MINIO_ENDPOINT,
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY!,
          secretAccessKey: process.env.MINIO_SECRET_KEY!,
        },
        forcePathStyle: true, // Requis pour MinIO
        region: 'us-east-1', // Obligatoire mais ignoré par MinIO
      },
    }),
  ],
})
```

---

## Formulaires avec Form Builder

```typescript
// payload.config.ts
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'

export default buildConfig({
  // ...
  plugins: [
    formBuilderPlugin({
      fields: {
        text: true,
        textarea: true,
        email: true,
        select: true,
        checkbox: true,
      },
      formOverrides: {
        admin: {
          group: 'Formulaires',
        },
      },
    }),
  ],
})
```
