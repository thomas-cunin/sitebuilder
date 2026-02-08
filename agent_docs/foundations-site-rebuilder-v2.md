# SiteRebuilder — Fondations & Architecture v2

## Vision du projet

Un pipeline orchestré qui prend un site web existant + des sites d'inspiration, et génère automatiquement un nouveau site complet avec CMS intégré, prêt à être prévisualisé et validé avant mise en production.

---

## 1. Principes directeurs

### 1.1 Pipeline par étapes avec artefacts intermédiaires

Chaque étape produit un **artefact JSON structuré** qui alimente la suivante. Cela permet de reprendre à n'importe quelle étape, de débugger, et de laisser l'utilisateur valider/modifier entre les étapes.

```
[Formulaire] → [Scraping] → [Analyse] → [Inspiration] → [Architecture] → [Design] → [Génération] → [Preview]
```

### 1.2 Séparation contenu / structure / style

Le contenu (textes, images, données) est toujours séparé de la structure (pages, sections, navigation) et du style (couleurs, typographies, espacements). Cela permet au CMS de ne gérer que le contenu, et de régénérer le site sans perdre les modifications éditoriales.

### 1.3 Claude Code comme moteur d'exécution

Chaque étape du pipeline est un **prompt structuré** envoyé à Claude Code via l'API ou le CLI. Le formulaire Next.js orchestre les appels et stocke les résultats intermédiaires. Claude Code écrit le code, pas l'utilisateur.

### 1.4 Preview-first delivery

Le site n'est jamais "livré" directement. Il est toujours prévisualisé dans un environnement isolé (conteneur Docker dédié) et l'utilisateur valide avant toute mise en production.

### 1.5 Isolation par conteneur

Chaque site généré tourne dans son propre conteneur Docker. Cela garantit l'isolation totale entre les projets, la reproductibilité, et simplifie le nettoyage.

---

## 2. Architecture globale

### 2.1 Vue d'ensemble Docker

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  orchestrator (Next.js 15)                          │    │
│  │  - Formulaire multi-step                            │    │
│  │  - Dashboard pipeline                               │    │
│  │  - Proxy preview (/:projectId → conteneur cible)    │    │
│  │  - API Routes d'orchestration                       │    │
│  │  Port: 3000                                         │    │
│  └──────────┬──────────────────────────────────────────┘    │
│             │                                               │
│  ┌──────────▼──────────┐  ┌────────────────────────────┐    │
│  │  redis               │  │  minio (S3-compatible)     │    │
│  │  - Job queue BullMQ  │  │  - Artefacts JSON          │    │
│  │  - Cache             │  │  - Images scrapées         │    │
│  │  Port: 6379          │  │  - Médias uploadés         │    │
│  └──────────────────────┘  │  - Snapshots de projets    │    │
│                            │  Port: 9000 (API)          │    │
│  ┌─────────────────────┐   │  Port: 9001 (Console)      │    │
│  │  postgres            │  └────────────────────────────┘    │
│  │  - Projets/metadata  │                                    │
│  │  - Users             │  ┌────────────────────────────┐    │
│  │  - Pipeline state    │  │  traefik (reverse proxy)   │    │
│  │  Port: 5432          │  │  - Routing dynamique       │    │
│  └──────────────────────┘  │  - *.preview.localhost      │    │
│                            │  Port: 80/443               │    │
│  ┌─────────────────────────└────────────────────────────┐    │
│  │                                                       │    │
│  │  preview-site-{projectId} (créés dynamiquement)       │    │
│  │  - Next.js 15 + Payload CMS 3                         │    │
│  │  - Un conteneur par site généré                       │    │
│  │  - Port dynamique (3001, 3002, ...)                   │    │
│  │  - Volume: ./storage/projects/{id}/site               │    │
│  │                                                       │    │
│  └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Stack technique

| Composant | Solution | Pourquoi |
|---|---|---|
| **Framework orchestrateur** | Next.js 15 (App Router) | Ton expertise, SSR, API routes intégrées |
| **Conteneurisation** | Docker + Docker Compose | Isolation, reproductibilité, cleanup facile |
| **Reverse proxy** | Traefik | Routing dynamique vers les previews, labels Docker |
| **UI formulaire** | React Hook Form + Zod | Validation robuste multi-étapes |
| **UI composants** | shadcn/ui + Tailwind | Rapide, customisable, cohérent |
| **Job queue** | BullMQ + Redis | Les étapes sont longues (30s-2min), besoin d'async |
| **Base de données** | PostgreSQL | Metadata projets, users, état du pipeline |
| **Stockage fichiers** | MinIO (S3-compatible) | Artefacts, médias, images scrapées, self-hosted |
| **Exécution IA** | Claude Code CLI (`claude -p`) | Exécution de code, accès filesystem, itératif |
| **Preview** | Conteneur Docker dédié par site | Isolation totale, preview live |

---

## 3. Sites générés — Stack technique

### Quel techno pour les sites produits ?

Chaque site généré par le pipeline est un **projet Next.js 15 + Payload CMS 3** autonome et complet. C'est un vrai projet, pas un site statique — il peut être déployé indépendamment sur n'importe quelle plateforme.

### Stack du site généré

| Couche | Techno | Rôle |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR, routing, Server Components |
| **CMS** | Payload CMS 3 | Admin, édition de contenu, API |
| **Base de données** | SQLite (dev/preview) → PostgreSQL (prod) | Stockage contenu et soumissions |
| **Styling** | Tailwind CSS 4 | Utility-first, design tokens du design system |
| **Richtext** | Lexical (via @payloadcms/richtext-lexical) | Éditeur WYSIWYG dans l'admin |
| **Formulaires** | Payload Form Builder | Gestion des formulaires de contact |
| **Email** | Resend | Notifications de soumission |
| **Validation** | Zod | Validation front + server actions |
| **Images** | Next/Image + sharp | Optimisation automatique |
| **Fonts** | next/font + Google Fonts | Performance, pas de FOUT |
| **SEO** | generateMetadata + JSON-LD | Server-side, crawlable |
| **Analytics** | (optionnel) Plausible / Umami | Privacy-first, self-hostable |

### Structure type d'un site généré

```
site-{projectId}/
├── Dockerfile                    # Build autonome
├── docker-compose.yml            # Pour déploiement standalone
├── package.json
├── next.config.ts
├── tailwind.config.ts            # Design tokens du projet
├── payload.config.ts             # Collections, plugins, config
├── src/
│   ├── app/
│   │   ├── (frontend)/           # Pages publiques
│   │   │   ├── layout.tsx        # Layout principal (nav, footer)
│   │   │   ├── page.tsx          # Homepage
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   └── [slug]/page.tsx   # Pages dynamiques Payload
│   │   └── (payload)/            # Admin CMS
│   │       └── admin/
│   │           └── [[...segments]]/page.tsx
│   ├── collections/              # Schémas Payload
│   │   ├── Pages.ts
│   │   ├── Navigation.ts
│   │   ├── Media.ts
│   │   ├── Forms.ts
│   │   └── FormSubmissions.ts
│   ├── components/
│   │   ├── sections/             # Composants de sections
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── CTA.tsx
│   │   │   ├── FAQ.tsx
│   │   │   └── ContactForm.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── ui/                   # Primitives (shadcn-style)
│   ├── lib/
│   │   ├── payload.ts            # Client Payload
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
├── public/
│   ├── images/                   # Images transférées/générées
│   └── fonts/
└── data/
    └── site.db                   # SQLite Payload (dev/preview)
```

### Pourquoi Next.js pour les sites générés aussi ?

La question se pose : pourquoi pas Astro, Hugo, ou du HTML statique ? Raisons :

1. **Payload CMS 3 est couplé à Next.js** — il vit dans le même process, pas de serveur séparé
2. **SSR natif** — les textes CMS sont rendus côté serveur, Google voit tout
3. **Server Actions** — les formulaires marchent sans API séparée
4. **Un seul écosystème** — l'orchestrateur et les sites générés partagent le même langage, les mêmes patterns, les mêmes libs
5. **Le Live Preview et l'inline editing** fonctionnent grâce au runtime Next.js
6. **Déploiement flexible** — Docker, Vercel, Railway, VPS classique

---

## 4. Docker — Architecture conteneurs

### 4.1 Docker Compose principal

```yaml
# docker-compose.yml
services:
  orchestrator:
    build: ./apps/orchestrator
    ports: ["3000:3000"]
    volumes:
      - ./storage:/app/storage          # Accès aux projets générés
      - /var/run/docker.sock:/var/run/docker.sock  # Pour créer des conteneurs
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/sitebuilder
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on: [postgres, redis, minio]
    labels:
      - "traefik.http.routers.orchestrator.rule=Host(`app.localhost`)"

  postgres:
    image: postgres:17-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      - POSTGRES_DB=sitebuilder
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine
    volumes: ["redisdata:/data"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes: ["miniodata:/data"]
    ports: ["9001:9001"]
    labels:
      - "traefik.http.routers.minio.rule=Host(`storage.localhost`)"

  traefik:
    image: traefik:v3
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports: ["80:80"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### 4.2 Création dynamique de conteneurs preview

L'orchestrateur utilise l'API Docker (via `dockerode`) pour lancer un conteneur par site généré :

```typescript
// Principe — l'orchestrateur crée un conteneur à la volée
import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

async function launchPreview(projectId: string) {
  const container = await docker.createContainer({
    Image: "site-preview:latest",         // Image de base préparée
    name: `preview-${projectId}`,
    HostConfig: {
      Binds: [`./storage/projects/${projectId}/site:/app`],
      NetworkMode: "sitebuilder_default",  // Même réseau Docker
    },
    Env: [
      `PAYLOAD_SECRET=${generateSecret()}`,
      `NEXT_PUBLIC_SITE_URL=http://${projectId}.preview.localhost`,
    ],
    Labels: {
      "traefik.enable": "true",
      [`traefik.http.routers.preview-${projectId}.rule`]:
        `Host(\`${projectId}.preview.localhost\`)`,
    },
  });

  await container.start();
  return `http://${projectId}.preview.localhost`;
}
```

### 4.3 Image de base pour les sites preview

```dockerfile
# docker/preview-base/Dockerfile
FROM node:20-alpine

WORKDIR /app
# Les dépendances communes sont pré-installées
COPY package.json.template package.json
RUN npm install

# Le code source est monté en volume, pas copié
# Cela permet de régénérer sans rebuilder l'image

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### 4.4 Dockerfile du site généré (export final)

Quand l'utilisateur valide le site, un Dockerfile de production est généré dans le projet :

```dockerfile
# site-{projectId}/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/data ./data

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 5. Stockage des fichiers générés

### 5.1 Stratégie globale

Le stockage est organisé en trois couches avec des responsabilités distinctes :

```
storage/
├── projects/
│   ├── {projectId}/
│   │   ├── artifacts/              ← Artefacts JSON du pipeline
│   │   │   ├── 01-scraping.json
│   │   │   ├── 02-analysis.json
│   │   │   ├── 03-inspiration.json
│   │   │   ├── 04-architecture.json
│   │   │   ├── 05-design.json
│   │   │   └── pipeline-state.json  ← État courant du pipeline
│   │   ├── scraped-assets/         ← Images/médias scrapés du site source
│   │   │   ├── logo.png
│   │   │   ├── hero-bg.jpg
│   │   │   └── ...
│   │   ├── site/                   ← Le projet Next.js généré (code source)
│   │   │   ├── src/
│   │   │   ├── public/
│   │   │   ├── package.json
│   │   │   └── ...
│   │   └── snapshots/              ← Versions sauvegardées
│   │       ├── v1-initial/
│   │       └── v2-after-feedback/
│   └── {projectId-2}/
│       └── ...
└── shared/
    └── templates/                  ← Templates de base réutilisables
        ├── base-nextjs-payload/
        └── section-library/
```

### 5.2 Qui stocke quoi et où

| Type de donnée | Stockage | Raison |
|---|---|---|
| **Artefacts JSON** (pipeline) | Filesystem local + copie MinIO | Filesystem pour accès rapide par Claude Code, MinIO pour persistance et backup |
| **Images scrapées** du site source | MinIO (bucket `scraped-assets`) | Binaires, potentiellement lourds, besoin de CDN |
| **Code source généré** (le site) | Filesystem local (volume Docker) | Claude Code a besoin d'un accès filesystem direct pour écrire/modifier |
| **Médias uploadés** par le client via Payload | MinIO (bucket `site-media-{projectId}`) | Payload supporte les adapters S3, les médias sont servis via MinIO |
| **Snapshots** (versions du site) | MinIO (bucket `snapshots`) | Tar.gz du dossier site/, pour rollback |
| **Metadata projets** (état, config, user) | PostgreSQL | Données relationnelles, requêtable |
| **État du pipeline** (jobs) | Redis (BullMQ) | Éphémère, rapide, TTL automatique |

### 5.3 MinIO — Configuration

MinIO est un serveur S3-compatible self-hosted. Il remplace AWS S3 en local/staging tout en étant compatible avec le SDK S3 standard.

Buckets créés automatiquement au démarrage :

```
scraped-assets/       # Images extraites des sites sources
site-media/           # Médias uploadés via Payload CMS
snapshots/            # Archives des versions de sites
exports/              # ZIPs téléchargeables par l'utilisateur
```

Les sites générés avec Payload utilisent `@payloadcms/storage-s3` pour stocker leurs médias directement dans MinIO :

```typescript
// Dans le payload.config.ts de chaque site généré
import { s3Storage } from "@payloadcms/storage-s3";

export default buildConfig({
  plugins: [
    s3Storage({
      bucket: `site-media-${projectId}`,
      config: {
        endpoint: process.env.MINIO_ENDPOINT,
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY,
          secretAccessKey: process.env.MINIO_SECRET_KEY,
        },
        forcePathStyle: true,  // Requis pour MinIO
      },
    }),
  ],
});
```

### 5.4 Cycle de vie des fichiers

```
Création projet
  └→ Dossier storage/projects/{id}/ créé
  └→ Buckets MinIO créés

Pipeline en cours
  └→ Artefacts écrits dans artifacts/ (filesystem)
  └→ Images scrapées envoyées dans MinIO
  └→ Code source écrit dans site/ (filesystem)

Preview active
  └→ Conteneur Docker monté sur site/
  └→ Médias servis depuis MinIO

Validation par l'utilisateur
  └→ Snapshot créé (tar.gz → MinIO)
  └→ Export ZIP disponible dans MinIO
  └→ Optionnel : push Git automatique

Suppression projet
  └→ Conteneur Docker stoppé et supprimé
  └→ Dossier filesystem supprimé
  └→ Buckets MinIO purgés
  └→ Metadata PostgreSQL soft-deleted
```

---

## 6. Headless CMS — Payload CMS 3

### 6.1 Pourquoi Payload CMS 3

| Critère | Payload CMS 3 | Alternatives |
|---|---|---|
| **Intégration Next.js** | Natif — vit DANS le projet Next.js | Strapi/Directus = serveur séparé |
| **Base de données** | SQLite (dev) / PostgreSQL (prod) | Strapi = PostgreSQL obligatoire |
| **Admin UI** | Incluse, auto-générée | ✅ équivalent |
| **Typage** | TypeScript natif, collections typées | Strapi = génération de types |
| **Coût** | Open source, gratuit | Sanity = payant au-delà du free tier |
| **Portabilité** | Le CMS fait partie du repo = un seul déploiement | 2 serveurs sinon |
| **Formulaires** | Form Builder plugin officiel | À coder soi-même |
| **Live Preview** | Officiel, intégré | À implémenter |
| **Stockage S3** | Plugin `@payloadcms/storage-s3` | Natif aussi sur Strapi |

### 6.2 Collections générées automatiquement

Le pipeline génère les collections Payload adaptées au site. Voici le socle commun :

```typescript
// collections/Pages.ts — Chaque page du site
{
  slug: "pages",
  admin: { useAsTitle: "title", livePreview: { url: "..." } },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", unique: true },
    { name: "meta", type: "group", fields: [
      { name: "title", type: "text" },
      { name: "description", type: "textarea" },
      { name: "image", type: "upload", relationTo: "media" },
    ]},
    { name: "sections", type: "blocks", blocks: [
      HeroBlock, FeaturesBlock, TestimonialsBlock, CTABlock, FAQBlock, ContactBlock
    ]},
  ],
}
```

```typescript
// Exemple de Block — chaque section est un "block" Payload
const HeroBlock = {
  slug: "hero",
  fields: [
    { name: "heading", type: "text" },
    { name: "subheading", type: "textarea" },
    { name: "backgroundImage", type: "upload", relationTo: "media" },
    { name: "cta", type: "group", fields: [
      { name: "label", type: "text" },
      { name: "link", type: "text" },
    ]},
  ],
};
```

Chaque texte, chaque image, chaque CTA est un champ éditable. Le client change "Bienvenue chez nous" en "Bienvenue chez Martin & Fils" directement dans l'admin, et c'est rendu côté serveur au prochain chargement.

### 6.3 Rendu SSR — SEO garanti

```tsx
// app/(frontend)/page.tsx
import { getPayload } from "payload";
import config from "@payload-config";
import { HeroSection } from "@/components/sections/Hero";
import { FeaturesSection } from "@/components/sections/Features";

// Server Component — tout est rendu côté serveur
export default async function HomePage() {
  const payload = await getPayload({ config });
  const page = await payload.find({
    collection: "pages",
    where: { slug: { equals: "home" } },
  });
  const { sections } = page.docs[0];

  return (
    <main>
      {sections.map((section) => {
        switch (section.blockType) {
          case "hero": return <HeroSection key={section.id} {...section} />;
          case "features": return <FeaturesSection key={section.id} {...section} />;
          // ...
        }
      })}
    </main>
  );
}

// Metas SEO dynamiques — aussi server-side
export async function generateMetadata() {
  const payload = await getPayload({ config });
  const page = await payload.find({ collection: "pages", where: { slug: { equals: "home" } } });
  return {
    title: page.docs[0].meta.title,
    description: page.docs[0].meta.description,
    openGraph: { images: [page.docs[0].meta.image?.url] },
  };
}
```

---

## 7. Édition inline depuis la page

### 7.1 Payload Live Preview (built-in)

Payload 3 intègre un Live Preview natif. L'admin voit un split-screen : le formulaire d'édition à gauche, le site en iframe à droite. Les changements sont reflétés en temps réel via `postMessage`.

Configuration dans la collection :

```typescript
// collections/Pages.ts
{
  slug: "pages",
  admin: {
    livePreview: {
      url: ({ data }) =>
        `${process.env.NEXT_PUBLIC_SITE_URL}/${data.slug === "home" ? "" : data.slug}`,
    },
  },
}
```

Côté frontend, le composant `<RefreshRouteOnSave />` de Payload écoute les messages et revalide la page :

```tsx
// components/LivePreviewListener.tsx
"use client";
import { RefreshRouteOnSave } from "@payloadcms/live-preview-react";

export function LivePreviewListener() {
  return <RefreshRouteOnSave serverURL={process.env.NEXT_PUBLIC_PAYLOAD_URL!} />;
}
```

### 7.2 Édition inline sur la page (mode avancé)

Au-delà du Live Preview admin, on peut ajouter un vrai mode d'édition inline directement sur le site public. L'idée : quand un admin est connecté, chaque zone de texte et chaque image affiche un indicateur cliquable qui ouvre un mini-éditeur en place.

**Architecture du mode inline editing :**

```
┌─────────────────────────────────────────────────┐
│  Site public (vue visiteur)                      │
│                                                  │
│  ┌─── Hero ──────────────────────────────┐      │
│  │  Bienvenue chez Martin & Fils         │      │
│  │  Votre partenaire depuis 1985         │      │
│  └───────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Site public (mode admin activé)                 │
│                                                  │
│  ┌─── Hero ──────────────────────[✏️]────┐      │
│  │  [✏️] Bienvenue chez Martin & Fils    │      │
│  │  [✏️] Votre partenaire depuis 1985    │      │
│  │  [📷] (changer image de fond)         │      │
│  └───────────────────────────────────────┘      │
│                                                  │
│  ┌── Inline Editor Popover ──────────────┐      │
│  │  Nouveau texte : [                  ] │      │
│  │  [Annuler]  [Sauvegarder]             │      │
│  └───────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

**Principes techniques :**

1. **Détection admin** — Un middleware Next.js vérifie le cookie de session Payload. Si admin authentifié, on injecte un flag `isAdmin: true` dans le layout.

2. **Wrapper `<Editable />`** — Chaque zone de contenu est wrappée dans un composant qui, en mode admin, ajoute un overlay avec un bouton d'édition :

```tsx
// components/inline-edit/Editable.tsx
"use client";

export function Editable({
  children,
  collection,      // "pages"
  id,              // ID du document Payload
  field,           // "sections.0.heading"
  fieldType,       // "text" | "richtext" | "image"
  isAdmin,
}: EditableProps) {
  if (!isAdmin) return <>{children}</>;

  return (
    <div className="group relative">
      {children}
      <button
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100"
        onClick={() => openEditor({ collection, id, field, fieldType })}
      >
        ✏️
      </button>
    </div>
  );
}
```

3. **Sauvegarde via API Payload** — Le mini-éditeur inline appelle l'API REST de Payload pour mettre à jour le champ spécifique :

```typescript
// PATCH vers l'API Payload — met à jour un seul champ
await fetch(`/api/pages/${documentId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sections: [{ ...existingSection, heading: "Nouveau titre" }],
  }),
});

// Puis revalidation Next.js pour rafraîchir le SSR
await fetch(`/api/revalidate?path=/`);
```

4. **Upload d'images** — Pour les médias, le bouton ouvre un file picker qui upload vers la collection Media de Payload, puis met à jour la référence :

```typescript
// Upload vers Payload Media
const formData = new FormData();
formData.append("file", selectedFile);
const media = await fetch("/api/media", { method: "POST", body: formData });

// Puis mise à jour de la référence dans le document
await fetch(`/api/pages/${documentId}`, {
  method: "PATCH",
  body: JSON.stringify({
    sections: [{ ...existingSection, backgroundImage: media.id }],
  }),
});
```

### 7.3 Récapitulatif des modes d'édition

| Mode | Qui l'utilise | Comment | Complexité |
|---|---|---|---|
| **Admin Payload** (`/admin`) | Le développeur / admin | Interface complète, tous les champs | Inclus nativement |
| **Live Preview** | L'admin dans le panel | Split-screen formulaire + preview | Config simple |
| **Inline Editing** | Le client final sur le site | Clic sur les éléments directement | Custom à développer |

---

## 8. Les 7 étapes du pipeline

### Étape 1 — Scraping & Extraction

**Input :** URL du site source
**Output :** `artefact-01-scraping.json` + images dans MinIO

**Outils & librairies :**
- **Playwright** — Scraping avec rendu JavaScript complet (SPA, sites dynamiques)
- **Cheerio** — Parsing HTML léger pour extraction structurée post-Playwright
- **Readability (Mozilla)** — Extraction du contenu principal vs chrome/navigation
- **sharp** — Téléchargement et optimisation des images

**Ce qui est extrait :**
- Arborescence complète du site (sitemap crawl récursif, limité au domaine)
- Pour chaque page : titre, meta, headings (h1-h6), texte par section, images, liens, formulaires
- Assets : logo, favicon, images principales, couleurs dominantes (via sharp + color-thief)
- Structure de navigation (header, footer, menus)
- Formulaires détectés (champs, actions, types)

### Étape 2 — Analyse du site source

**Input :** `artefact-01-scraping.json`
**Output :** `artefact-02-analysis.json`
**Exécuteur :** Claude (API Anthropic)

**Ce qui est analysé :**
- Secteur d'activité et positionnement de l'entreprise
- Forces et faiblesses du site actuel (UX, contenu, performance perçue)
- Public cible identifié à partir du ton et du contenu
- Pages essentielles vs pages secondaires
- Fonctionnalités clés (formulaires de contact, réservation, e-commerce, blog, etc.)
- Tone of voice actuel (formel, décontracté, technique, etc.)
- SEO baseline (structure des titres, metas, maillage interne)

### Étape 3 — Analyse des inspirations

**Input :** URLs d'inspiration + `artefact-02-analysis.json`
**Output :** `artefact-03-inspiration.json`
**Outils :** Playwright (scraping) + Claude (analyse)

**Ce qui est extrait et analysé :**
- Design patterns utilisés (layout, animations, interactions)
- Palette de couleurs et typographies
- Structure des pages (quelles sections, dans quel ordre)
- Éléments différenciants à retenir
- Synthèse : ce qu'on retient de chaque inspiration et pourquoi, croisé avec le secteur du site source

### Étape 4 — Architecture & Structure

**Input :** `artefact-02-analysis.json` + `artefact-03-inspiration.json`
**Output :** `artefact-04-architecture.json`
**Exécuteur :** Claude (API Anthropic)

**Ce qui est produit :**
- Arborescence du nouveau site (pages, hiérarchie)
- Pour chaque page : liste ordonnée de sections avec leur type
- Plan de contenu : quels textes doivent être réécrits, lesquels conservés
- Mapping des formulaires (quels formulaires, quels champs, quelles actions)
- Définition des "content slots" éditables via CMS → deviennent les Blocks Payload

### Étape 5 — Design System

**Input :** `artefact-03-inspiration.json` + `artefact-04-architecture.json`
**Output :** `artefact-05-design.json`
**Exécuteur :** Claude (API Anthropic)

**Ce qui est produit :**
- Palette de couleurs (primary, secondary, accent, neutral, semantic)
- Typographies (headings, body, UI — avec fallbacks Google Fonts)
- Espacements (scale basée sur 4px ou 8px)
- Composants : définition des variants pour chaque type de section
- Tokens Tailwind : fichier `tailwind.config` prêt à l'emploi
- Mood / direction artistique en texte, pour guider la génération

### Étape 6 — Génération du site + contenus

**Input :** Tous les artefacts précédents
**Output :** Projet Next.js + Payload complet dans `storage/projects/{id}/site/`
**Exécuteur :** Claude Code CLI (sous-étapes)

Décomposition en sous-étapes (chacune = un appel Claude Code) :
1. **Scaffolding** — Structure projet, config Next.js + Payload + Tailwind
2. **Design tokens** — Appliquer le design system au `tailwind.config.ts`
3. **Collections Payload** — Générer les schémas de données
4. **Composants** — Générer chaque composant de section un par un
5. **Pages** — Assembler les pages à partir des composants
6. **Contenus** — Rédiger les textes finaux, seeder la base Payload
7. **Formulaires** — Configurer le Form Builder et les composants form
8. **Inline editing** — Ajouter le wrapper `<Editable />` et le mode admin
9. **Finitions** — Navigation, footer, meta SEO, favicon, Dockerfile

### Étape 7 — Preview live

**Input :** Projet généré sur le filesystem
**Output :** URL de preview (`{projectId}.preview.localhost`)

**Mécanisme :**
- L'orchestrateur crée un conteneur Docker via `dockerode`
- Le code source est monté en volume (pas copié → modifications en temps réel)
- Traefik route automatiquement `{projectId}.preview.localhost` vers le conteneur
- L'utilisateur peut naviguer le site, tester les formulaires, modifier via inline editing
- Interface de feedback dans l'orchestrateur : annoter, demander des modifications, relancer une étape

---

## 9. Orchestration Claude Code

### Approche CLI (étapes avec génération de code)

```bash
claude -p "Tu es un expert en développement Next.js et Payload CMS.
Voici l'architecture du site à générer : $(cat artefact-04-architecture.json)
Voici le design system : $(cat artefact-05-design.json)
Génère le composant Hero dans src/components/sections/Hero.tsx
en suivant les tokens Tailwind et les données de la collection Pages." \
  --allowedTools "Edit,Write,Bash" \
  --output-dir ./storage/projects/${PROJECT_ID}/site/
```

### Approche API (étapes d'analyse pure)

```typescript
// lib/pipeline/executor.ts
import Anthropic from "@anthropic-ai/sdk";

interface PipelineStep {
  name: string;
  systemPrompt: string;
  buildUserPrompt: (artifacts: Record<string, any>) => string;
  outputSchema: z.ZodSchema;
  maxTokens: number;
}

async function executeStep(step: PipelineStep, artifacts: Record<string, any>) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: step.maxTokens,
    system: step.systemPrompt,
    messages: [{ role: "user", content: step.buildUserPrompt(artifacts) }],
  });
  const result = parseResponse(response);
  return step.outputSchema.parse(result);
}
```

### Quelle approche pour quelle étape

| Étape | Approche | Modèle recommandé | Raison |
|---|---|---|---|
| 1 — Scraping | Code direct (pas d'IA) | — | Playwright/Cheerio suffisent |
| 2 — Analyse | API Anthropic | Sonnet | Analyse textuelle, pas de code |
| 3 — Inspiration | API Anthropic | Sonnet | Idem |
| 4 — Architecture | API Anthropic | Sonnet | Structuration, pas de code |
| 5 — Design System | API Anthropic | Sonnet | Décisions de design |
| 6 — Génération | Claude Code CLI | Sonnet | Écriture de fichiers sur le filesystem |
| 7 — Preview | Code direct (Docker API) | — | dockerode, pas d'IA |

---

## 10. Gestion des formulaires

### Stratégie

Les formulaires du site source sont détectés à l'étape 1 et mappés à l'étape 4. Trois approches selon le type :

| Type de formulaire | Solution |
|---|---|
| **Contact simple** | Payload Form Builder + Server Action Next.js |
| **Newsletter** | Intégration API externe (Mailchimp, Resend, Brevo) |
| **Complexe (devis, réservation)** | Payload collection custom + webhook |

### Payload Form Builder

- Création de formulaires dans l'admin Payload (drag & drop des champs)
- Soumissions stockées en base
- Notifications email configurables (via Resend ou Nodemailer)
- Les formulaires sont rendus côté React via un composant générique

Le pipeline génère automatiquement :
1. La collection Payload `FormSubmissions`
2. Le composant React `<ContactForm />` avec validation Zod
3. La Server Action qui envoie à Payload + email
4. La config email (Resend recommandé pour la simplicité)

---

## 11. Librairies & dépendances complètes

### Orchestrateur (le projet Next.js principal)

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "zod": "^3",
    "bullmq": "^5",
    "ioredis": "^5",
    "@anthropic-ai/sdk": "latest",
    "playwright": "^1.45",
    "cheerio": "^1.0",
    "@mozilla/readability": "^0.5",
    "sharp": "^0.33",
    "colorthief": "^2",
    "dockerode": "^4",
    "@aws-sdk/client-s3": "^3",
    "drizzle-orm": "^0.36",
    "postgres": "^3"
  },
  "devDependencies": {
    "tailwindcss": "^4",
    "@shadcn/ui": "latest",
    "typescript": "^5",
    "drizzle-kit": "latest"
  }
}
```

### Site généré (le output du pipeline)

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "payload": "^3",
    "@payloadcms/db-sqlite": "^3",
    "@payloadcms/db-postgres": "^3",
    "@payloadcms/richtext-lexical": "^3",
    "@payloadcms/plugin-form-builder": "^3",
    "@payloadcms/storage-s3": "^3",
    "@payloadcms/live-preview-react": "^3",
    "resend": "^4",
    "zod": "^3"
  },
  "devDependencies": {
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 12. Phases de développement

### Phase 1 — Socle technique (Semaines 1-2)

**Objectif :** Avoir l'infra Docker qui tourne et le formulaire de base.

**Tâches :**
- Setup monorepo (ou dossier `apps/orchestrator`)
- Docker Compose avec orchestrateur + PostgreSQL + Redis + MinIO + Traefik
- Schéma de base PostgreSQL (projets, état pipeline) via Drizzle ORM
- Formulaire multi-étapes basique (URL source + URLs inspiration + notes)
- Configuration MinIO : buckets, accès S3
- Structure de dossiers `storage/projects/`
- CI/CD basique (lint, type-check)

**Livrable :** `docker compose up` → formulaire accessible sur `app.localhost`, données sauvées en base.

---

### Phase 2 — Scraping & Pipeline engine (Semaines 3-4)

**Objectif :** Le scraping fonctionne et l'engine de pipeline exécute les étapes séquentiellement.

**Tâches :**
- Pipeline engine : système de jobs BullMQ avec statuts, retry, logs
- Dashboard temps réel (SSE) pour suivre l'avancement
- Étape 1 (Scraping) : Playwright crawl récursif + Cheerio extraction + stockage images MinIO
- Artefact 01 complet et validé par schéma Zod
- Viewer d'artefacts JSON dans le dashboard

**Livrable :** Soumettre une URL → voir le scraping s'exécuter en temps réel → consulter l'artefact structuré.

---

### Phase 3 — Étapes d'analyse IA (Semaines 5-6)

**Objectif :** Les étapes 2 à 5 fonctionnent via l'API Anthropic.

**Tâches :**
- Étape 2 (Analyse) : prompt structuré + schéma de sortie Zod
- Étape 3 (Inspiration) : scraping des sites d'inspi + analyse croisée
- Étape 4 (Architecture) : génération arborescence + content slots
- Étape 5 (Design System) : palette, typo, tokens Tailwind
- Prompts itérés et testés sur 5-10 sites réels
- Possibilité d'éditer manuellement chaque artefact avant de continuer

**Livrable :** Pipeline complet de l'URL jusqu'au design system, avec validation humaine possible à chaque étape.

---

### Phase 4 — Génération de site (Semaines 7-10)

**Objectif :** Claude Code génère un site Next.js + Payload fonctionnel.

**Tâches :**
- Template de base Next.js + Payload (le "starter" que Claude Code part pour modifier)
- Bibliothèque de prompts pour chaque sous-étape de génération (scaffolding → finitions)
- Intégration Claude Code CLI depuis l'orchestrateur (spawn process)
- Génération des collections Payload à partir de l'artefact architecture
- Génération des composants de sections
- Rédaction des contenus par Claude
- Seed de la base Payload avec les contenus générés
- Tests : générer 5-10 sites pour valider la robustesse

**Livrable :** Un site Next.js + Payload complet est généré sur le filesystem à partir de n'importe quel site source.

---

### Phase 5 — Preview Docker (Semaines 11-12)

**Objectif :** Le site généré tourne dans un conteneur Docker et est accessible via le navigateur.

**Tâches :**
- Image Docker de base pour les previews
- Création dynamique de conteneurs via dockerode
- Routing Traefik : `{projectId}.preview.localhost`
- Proxy dans l'orchestrateur pour iframe embedding
- Interface preview dans le dashboard (iframe + contrôles)
- Gestion du cycle de vie des conteneurs (start, stop, remove, auto-cleanup)
- Système de snapshots (sauvegarde version avant modification)

**Livrable :** Cliquer "Preview" → le site s'ouvre dans un iframe, navigable et fonctionnel.

---

### Phase 6 — Inline editing & CMS (Semaines 13-14)

**Objectif :** Le client peut modifier textes et images directement depuis la page.

**Tâches :**
- Composant `<Editable />` avec détection admin
- Mini-éditeur inline (texte simple + richtext)
- Upload d'images inline via Payload Media
- Payload Live Preview configuré sur toutes les collections
- Intégration du storage S3 (MinIO) pour les médias Payload
- Tests d'édition end-to-end

**Livrable :** Un admin connecté peut cliquer sur n'importe quel texte/image du site et le modifier en place.

---

### Phase 7 — Export & itération (Semaines 15-16)

**Objectif :** Le site peut être exporté et les utilisateurs peuvent demander des modifications.

**Tâches :**
- Export ZIP téléchargeable (projet complet avec Dockerfile)
- Push Git automatique (GitHub/GitLab)
- Système de feedback : annoter des zones, décrire les changements souhaités
- Régénération partielle : relancer une sous-étape de l'étape 6 sans tout refaire
- Dockerfile de production dans chaque site généré
- Documentation auto-générée pour le client (comment utiliser l'admin Payload)

**Livrable :** Workflow complet : URL → pipeline → preview → modification → export.

---

### Phase 8 — Polish & robustesse (Semaines 17-18)

**Objectif :** Le produit est fiable et agréable à utiliser.

**Tâches :**
- Gestion d'erreurs complète (chaque étape peut échouer gracieusement)
- Rate limiting API Anthropic + retry exponential backoff
- Monitoring : logs structurés, métriques de génération
- Nettoyage automatique des projets expirés (conteneurs + fichiers + MinIO)
- Optimisation des prompts basée sur les retours des phases précédentes
- Tests sur 20+ sites variés (vitrines, SaaS, e-commerce, blogs)
- UI/UX polish du dashboard

**Livrable :** Produit stable, testé, documenté.

---

## 13. Points d'attention & risques

| Risque | Mitigation |
|---|---|
| **Scraping bloqué** (anti-bot, SPA lourdes) | Playwright avec stealth plugin + fallback ScrapingBee |
| **Tokens API coûteux** (étape 6 très longue) | Découper en sous-étapes, Haiku pour les tâches simples |
| **Qualité du design généré** | Design system contraint fortement, pas de "freestyle" |
| **Conteneurs Docker qui s'accumulent** | Auto-cleanup avec TTL, limite max par user |
| **Espace disque** | MinIO avec lifecycle policies, suppression des vieux snapshots |
| **Formulaires complexes** | Détecter et alerter si hors scope (paiement, auth) |
| **Droits sur le contenu** | Textes réécrits, pas copiés ; images originales avec avertissement |
| **Preview qui plante** | Health check Docker, fallback screenshots statiques |
| **Sécurité Docker socket** | Accès restreint, pas de mode privileged, network isolation |

---

## 14. Évolutions futures

- **Mode itératif** : "Modifie juste le hero" → relance partielle de l'étape 6
- **Bibliothèque de templates** : Les sites générés deviennent des templates réutilisables
- **A/B testing** : Générer 2-3 variantes de certaines sections
- **Intégration FlowPath** : Le site généré peut inclure un parcours client FlowPath
- **Multi-langue** : Génération i18n avec `next-intl`
- **Suivi SEO** : Comparaison avant/après sur les métriques SEO
- **Déploiement one-click** : Push vers Vercel/Railway/Coolify depuis le dashboard
- **Mode multi-tenant** : Plusieurs utilisateurs avec projets isolés
- **Marketplace de sections** : Composants premium ou community-driven

---

## Résumé décisionnel

| Décision | Choix | Raison |
|---|---|---|
| Framework orchestrateur | **Next.js 15** | Expertise, API routes, SSR |
| Framework sites générés | **Next.js 15 + Payload CMS 3** | CMS intégré, SSR, un seul déploiement |
| Conteneurisation | **Docker + Docker Compose** | Isolation, reproductibilité |
| Reverse proxy | **Traefik** | Routing dynamique via labels Docker |
| Exécution IA (analyse) | **API Anthropic (Sonnet)** | Analyse pure, pas de filesystem |
| Exécution IA (génération) | **Claude Code CLI** | Écriture de fichiers, itératif |
| CMS embarqué | **Payload CMS 3** | Vit dans Next.js, zéro infra supplémentaire |
| Édition inline | **Custom `<Editable />` + API Payload** | UX client final optimale |
| Formulaires | **Payload Form Builder** | Natif, soumissions stockées, emails |
| Scraping | **Playwright + Cheerio** | JS rendering + parsing rapide |
| Job queue | **BullMQ + Redis** | Étapes longues, retry, monitoring |
| Base de données orchestrateur | **PostgreSQL + Drizzle ORM** | Robuste, typé |
| Base de données sites générés | **SQLite (preview) → PostgreSQL (prod)** | Léger en dev, robuste en prod |
| Stockage fichiers | **MinIO (S3-compatible)** | Self-hosted, compatible SDK S3 |
| Preview | **Conteneur Docker dédié + Traefik** | Isolation totale, routing automatique |
| Styling | **Tailwind CSS 4** | Design tokens, utility-first |
| Validation | **Zod** | Schémas partagés partout |
| Email | **Resend** | Simple, bon DX |
