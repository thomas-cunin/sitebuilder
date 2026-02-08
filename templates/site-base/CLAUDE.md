# Instructions pour Claude Code - Site Généré

Ce fichier contient les instructions pour modifier ce site Next.js + Payload CMS.

## Stack Technique

- **Framework**: Next.js 15 (App Router, Server Components par défaut)
- **CMS**: Payload CMS 3.14
- **Styles**: Tailwind CSS 4
- **Base de données**: SQLite (dev) / PostgreSQL (prod)
- **TypeScript**: Strict mode activé

## Structure du Projet

```
src/
├── app/
│   ├── (frontend)/         # Pages publiques
│   │   ├── layout.tsx      # Layout avec Header/Footer
│   │   ├── page.tsx        # Page d'accueil (slug: "/")
│   │   └── [slug]/page.tsx # Pages dynamiques
│   ├── (payload)/admin/    # Admin Payload (ne pas modifier)
│   └── api/                # Routes API
├── blocks/                 # Définitions Payload des blocks
├── collections/            # Collections Payload
├── components/
│   ├── sections/           # Composants React des sections
│   ├── layout/             # Header, Footer
│   └── ui/                 # Composants UI réutilisables
├── lib/
│   ├── payload.ts          # Helper getPayload()
│   └── utils.ts            # Utilitaires (cn, formatDate, etc.)
└── seed/                   # Script de seed initial
```

## Types de Sections Disponibles

Les 16 types de sections sont définis dans `src/blocks/`:

| Type | Usage |
|------|-------|
| `hero` | Section principale avec CTA |
| `features` | Grille de fonctionnalités/avantages |
| `about` | Présentation avec image et texte |
| `services` | Liste de services/prestations |
| `testimonials` | Témoignages clients |
| `team` | Équipe/membres |
| `pricing` | Tableaux de prix |
| `faq` | Questions fréquentes |
| `cta` | Appel à l'action |
| `contact` | Formulaire de contact |
| `stats` | Statistiques/chiffres clés |
| `gallery` | Galerie d'images |
| `partners` | Logos partenaires/clients |
| `newsletter` | Inscription newsletter |
| `content` | Contenu riche (texte libre) |
| `video` | Vidéo YouTube/Vimeo/upload |

## Comment Modifier une Section

### 1. Structure d'un bloc (définition Payload)

Les définitions sont dans `src/blocks/{NomSection}.ts`. Elles définissent les champs disponibles dans l'admin.

```typescript
// src/blocks/Hero.ts
export const Hero: Block = {
  slug: 'hero',
  fields: [
    { name: 'headline', type: 'text', required: true },
    { name: 'subheadline', type: 'textarea' },
    // ...
  ],
}
```

### 2. Composant React correspondant

Les composants React sont dans `src/components/sections/{NomSection}.tsx`. Ils reçoivent les données du bloc et rendent le HTML.

```typescript
// src/components/sections/Hero.tsx
interface HeroProps {
  headline: string
  subheadline?: string
  // ...
}

export function Hero({ headline, subheadline }: HeroProps) {
  return (
    <section className="...">
      <h1>{headline}</h1>
      {subheadline && <p>{subheadline}</p>}
    </section>
  )
}
```

### 3. SectionRenderer

Le `SectionRenderer` mappe automatiquement les blockTypes vers les composants. Il est dans `src/components/SectionRenderer.tsx`.

## Patterns de Code

### Server Components (par défaut)

```typescript
// src/app/(frontend)/page.tsx
import { getPayload } from '@/lib/payload'

export default async function Page() {
  const payload = await getPayload()
  const data = await payload.find({ collection: 'pages' })
  return <div>{/* Render data */}</div>
}
```

### Client Components (quand nécessaire)

```typescript
'use client'

import { useState } from 'react'

export function InteractiveComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Styles avec Tailwind

```typescript
import { cn } from '@/lib/utils'

function Component({ className, variant }: Props) {
  return (
    <div className={cn(
      'base-styles',
      variant === 'primary' && 'primary-styles',
      className
    )}>
      {/* content */}
    </div>
  )
}
```

## Design Tokens

Les tokens de design sont dans `tailwind.config.ts`. Les couleurs principales sont:

- `primary-*`: Couleur principale (50-950)
- `secondary-*`: Couleur secondaire (50-950)
- `accent-*`: Couleur d'accent (50-950)

Pour modifier les couleurs, éditer la section `theme.extend.colors` dans `tailwind.config.ts`.

## Commandes Utiles

```bash
npm run dev          # Lancer en développement
npm run build        # Build de production
npm run typecheck    # Vérifier les types TypeScript
npm run lint         # Vérifier le code avec ESLint
npm run seed         # Peupler la base de données
```

## Règles Importantes

1. **Ne pas modifier les fichiers dans `(payload)`** — Ils sont générés par Payload
2. **Server Components par défaut** — N'ajouter `'use client'` que si nécessaire
3. **Toujours utiliser `cn()`** pour combiner des classes Tailwind
4. **Imports absolus** avec le préfixe `@/`
5. **TypeScript strict** — Pas de `any`, typer toutes les props

## Ajouter une Nouvelle Section

1. Créer le bloc dans `src/blocks/NouvelleSection.ts`
2. Exporter dans `src/blocks/index.ts`
3. Créer le composant dans `src/components/sections/NouvelleSection.tsx`
4. Exporter dans `src/components/sections/index.ts`
5. Ajouter le case dans `SectionRenderer.tsx`

## Modifier les Couleurs du Site

1. Ouvrir `tailwind.config.ts`
2. Modifier `theme.extend.colors.primary` (et secondary/accent si besoin)
3. Les changements s'appliquent automatiquement partout

## Modifier la Navigation

La navigation est gérée via Payload CMS:
- Collection: `navigation` avec `location: 'header' | 'footer'`
- Global: `settings` pour le nom du site, logo, etc.
