# SiteRebuilder — Roadmap de développement

## Comment utiliser ce document

Ce document est conçu pour être utilisé directement avec Claude Code. Chaque partie est **autonome** et numérotée. Tu peux dire :

```
"Développe la partie 1.1 du projet SiteRebuilder. 
Lis le fichier ROADMAP.md pour les instructions détaillées."
```

Les parties sont **séquentielles** — chaque partie dépend de celles qui la précèdent. Les dépendances sont explicitement listées.

### Convention de nommage des parties

```
Partie X.Y
  X = Phase (1 à 8)
  Y = Étape dans la phase (1, 2, 3...)
```

### Avant de commencer chaque partie

1. S'assurer que les parties précédentes sont terminées (check les critères ✅)
2. `/clear` le contexte Claude Code
3. Lire cette partie + les fichiers référencés
4. Coder en suivant les instructions

### Mode autonome recommandé

Le projet sera développé principalement par Claude Code **sans validation manuelle** à chaque action. Voici la configuration recommandée :

**Option 1 — Sandbox + Auto-accept (RECOMMANDÉ)** :
```bash
# Activer le sandbox au premier lancement
/sandbox

# Puis activer l'auto-accept avec Shift+Tab
# Claude travaille librement dans le sandbox, demande permission 
# uniquement pour les actions hors périmètre
```
Le sandbox réduit les prompts de permission de ~84% en définissant des limites filesystem et réseau au niveau OS. Claude peut lire/écrire dans le répertoire du projet sans demander, mais ne peut pas toucher au reste du système.

**Option 2 — YOLO mode (pour les tâches bien scopées)** :
```bash
# Mode complètement autonome — aucune permission demandée
claude --dangerously-skip-permissions

# Avec limite de budget pour éviter les dérapages
claude --dangerously-skip-permissions --max-budget-usd 10.00

# Avec session nommée pour pouvoir reprendre
claude --dangerously-skip-permissions --resume "partie-2.3"
```

**Option 3 — AllowedTools (contrôle granulaire)** :
```bash
# Autorise les outils courants sans prompt, bloque les dangereux
claude --dangerously-skip-permissions --disallowedTools "Bash(rm -rf:*)"
```

**Ou dans `.claude/settings.json`** :
```json
{
  "permissions": {
    "allow": [
      "Edit",
      "Write",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(node:*)",
      "Bash(git:*)",
      "Bash(docker:*)",
      "Bash(mkdir:*)",
      "Bash(cp:*)",
      "Bash(cat:*)",
      "Bash(ls:*)"
    ]
  }
}
```

**Recommandation par phase** :
- Phases 1-3 (infra, pipeline, analyse) → **Sandbox + Auto-accept** (filet de sécurité, on construit le socle)
- Phase 4 (génération de sites) → **YOLO mode** (Claude génère des projets entiers, pas de validation par action)
- Phases 5-8 (preview, editing, polish) → **Sandbox + Auto-accept** (modifications ciblées, plus de risque)

---

## PHASE 1 — Socle technique

**Objectif global** : Infra Docker fonctionnelle + formulaire de base accessible.

---

### Partie 1.1 — Structure du projet et Docker Compose

**Dépendances** : Aucune (point de départ)

**Ce qu'il faut faire** :
1. Créer la structure de dossiers du monorepo
2. Créer le `docker-compose.yml` avec tous les services
3. Créer le `CLAUDE.md` racine du projet
4. Vérifier que `docker compose up` démarre tout sans erreur

**Structure à créer** :

```
sitebuilder/
├── CLAUDE.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── apps/
│   └── orchestrator/           # (vide pour l'instant, sera créé en 1.2)
├── templates/
│   └── site-base/              # (vide pour l'instant, sera créé en 4.1)
├── storage/
│   └── projects/               # Dossier des projets générés (gitignored)
├── docker/
│   ├── orchestrator/
│   │   └── Dockerfile
│   └── preview-base/
│       └── Dockerfile
└── agent_docs/
    ├── pipeline-architecture.md
    ├── docker-management.md
    ├── payload-cms-patterns.md
    ├── scraping-strategy.md
    └── prompt-engineering.md
```

**Docker Compose — services à configurer** :
- `orchestrator` : Node 20, port 3000, volumes sur `./storage` et Docker socket
- `postgres` : PostgreSQL 17 Alpine, volume persistant, base `sitebuilder`
- `redis` : Redis 7 Alpine, volume persistant
- `minio` : MinIO, ports 9000 (API) + 9001 (console), volume persistant
- `traefik` : v3, provider Docker, port 80, routing dynamique
- Network commun `sitebuilder-network`

**Variables d'environnement (.env.example)** :
```
DATABASE_URL=postgresql://user:password@postgres:5432/sitebuilder
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
ANTHROPIC_API_KEY=sk-ant-...
```

**Labels Traefik** :
- orchestrator → `app.localhost`
- minio console → `storage.localhost`
- previews → `{projectId}.preview.localhost` (configuré dynamiquement plus tard)

**Critères de validation** :
- ✅ `docker compose up -d` démarre les 5 services sans erreur
- ✅ `docker compose ps` montre tous les services "healthy"
- ✅ `curl http://app.localhost` retourne une réponse (même vide)
- ✅ `curl http://storage.localhost` accède à la console MinIO
- ✅ PostgreSQL accessible depuis le conteneur orchestrator
- ✅ Redis accessible depuis le conteneur orchestrator
- ✅ CLAUDE.md racine créé avec vue d'ensemble du projet

---

### Partie 1.2 — App Next.js orchestrateur

**Dépendances** : Partie 1.1 terminée

**Ce qu'il faut faire** :
1. Initialiser un projet Next.js 15 dans `apps/orchestrator/`
2. Configurer TypeScript strict, Tailwind CSS 4, shadcn/ui
3. Créer le layout de base avec sidebar navigation
4. Configurer le Dockerfile de l'orchestrateur
5. Vérifier que l'app tourne dans Docker

**Pages à créer** :
- `/` → Dashboard (liste des projets)
- `/projects/new` → Formulaire de création (placeholder)
- `/projects/[id]` → Vue pipeline d'un projet (placeholder)
- `/projects/[id]/preview` → Preview d'un site (placeholder)

**Configuration** :
- `tsconfig.json` : strict mode, paths `@/` pour imports absolus
- `tailwind.config.ts` : config de base avec les couleurs shadcn
- `next.config.ts` : output standalone (pour Docker)
- CLAUDE.md dans `apps/orchestrator/` avec conventions spécifiques

**Dépendances à installer** :
```
next react react-dom typescript tailwindcss
@shadcn/ui (init avec theme)
```

**Critères de validation** :
- ✅ `npm run dev` dans apps/orchestrator → app accessible sur localhost:3000
- ✅ `docker compose up` → app accessible sur `app.localhost`
- ✅ Les 4 pages existent et sont navigables
- ✅ Layout avec sidebar fonctionnel
- ✅ TypeScript compile sans erreur
- ✅ Tailwind + shadcn/ui fonctionnels (un bouton shadcn visible)

---

### Partie 1.3 — Base de données PostgreSQL + Drizzle ORM

**Dépendances** : Partie 1.2 terminée

**Ce qu'il faut faire** :
1. Installer et configurer Drizzle ORM
2. Créer le schéma de base de données
3. Générer les migrations
4. Seeder avec des données de test
5. Écrire les tests du schéma

**Schéma à créer** :

```typescript
// Tables principales
projects {
  id: uuid (PK)
  name: string
  sourceUrl: string
  inspirationUrls: string[] (jsonb)
  notes: text (nullable)
  status: enum('draft', 'scraping', 'analyzing', 'generating', 'preview', 'done', 'error')
  currentStep: integer (1-7)
  createdAt: timestamp
  updatedAt: timestamp
}

pipeline_steps {
  id: uuid (PK)
  projectId: uuid (FK → projects)
  step: integer (1-7)
  name: string
  status: enum('pending', 'running', 'done', 'error', 'skipped')
  artifactPath: string (nullable)  // chemin vers le JSON
  startedAt: timestamp (nullable)
  completedAt: timestamp (nullable)
  error: text (nullable)
  metadata: jsonb (nullable)       // durée, tokens utilisés, etc.
}

pipeline_logs {
  id: uuid (PK)
  projectId: uuid (FK → projects)
  stepId: uuid (FK → pipeline_steps, nullable)
  level: enum('info', 'warn', 'error', 'debug')
  message: text
  data: jsonb (nullable)
  createdAt: timestamp
}
```

**Dépendances à installer** :
```
drizzle-orm postgres
drizzle-kit (dev)
```

**Critères de validation** :
- ✅ `npm run db:generate` crée les migrations
- ✅ `npm run db:migrate` applique le schéma à PostgreSQL
- ✅ `npm run db:seed` insère des données de test
- ✅ Tests unitaires du schéma passent (insert, select, update, relations)
- ✅ Les relations FK fonctionnent (project → steps → logs)

---

### Partie 1.4 — Configuration MinIO + service de stockage

**Dépendances** : Partie 1.2 terminée

**Ce qu'il faut faire** :
1. Créer un service de stockage S3 réutilisable (`lib/storage.ts`)
2. Créer automatiquement les buckets au démarrage
3. Fonctions CRUD : upload, download, delete, list, getSignedUrl
4. Tests unitaires du service de stockage

**Buckets à créer** :
- `scraped-assets` — Images extraites des sites sources
- `site-media` — Médias uploadés via Payload CMS
- `snapshots` — Archives des versions de sites
- `exports` — ZIPs téléchargeables

**Interface du service** :
```typescript
// lib/storage.ts
interface StorageService {
  upload(bucket: string, key: string, data: Buffer, contentType: string): Promise<string>
  download(bucket: string, key: string): Promise<Buffer>
  delete(bucket: string, key: string): Promise<void>
  list(bucket: string, prefix?: string): Promise<string[]>
  getSignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>
  ensureBuckets(): Promise<void>  // Crée les buckets s'ils n'existent pas
}
```

**Dépendances à installer** :
```
@aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Critères de validation** :
- ✅ Les 4 buckets sont créés au démarrage de l'app
- ✅ Upload/download/delete fonctionnent (test avec un fichier image)
- ✅ getSignedUrl retourne une URL accessible
- ✅ Tests unitaires passent
- ✅ Visible dans la console MinIO (`storage.localhost`)

---

### Partie 1.5 — Formulaire de création de projet

**Dépendances** : Parties 1.3 et 1.4 terminées

**Ce qu'il faut faire** :
1. Créer le formulaire multi-étapes sur `/projects/new`
2. Validation avec React Hook Form + Zod
3. Server Action pour créer le projet en base
4. Redirection vers `/projects/[id]` après création
5. Créer le dossier `storage/projects/{id}/` avec la structure

**Étapes du formulaire** :

```
Étape 1 : Site source
  - URL du site à refaire (required, URL valide)
  - Nom du projet (auto-généré depuis le domaine, éditable)

Étape 2 : Inspirations
  - 1 à 5 URLs d'inspiration (champ dynamique, add/remove)
  - Chaque URL validée en temps réel

Étape 3 : Paramètres
  - Notes et instructions (textarea, optionnel)
  - Ton souhaité : select (formel, décontracté, technique, friendly, auto-detect)
  - Priorité : select (fidèle à l'original, inspiré par les exemples, redesign complet)

Étape 4 : Confirmation
  - Récapitulatif de toutes les infos saisies
  - Bouton "Lancer le pipeline"
```

**À la soumission** :
1. Créer le projet en base (table `projects`)
2. Créer les 7 lignes `pipeline_steps` (status: pending)
3. Créer le dossier `storage/projects/{id}/artifacts/`
4. Rediriger vers `/projects/[id]`

**Dépendances à installer** :
```
react-hook-form @hookform/resolvers zod
```

**Critères de validation** :
- ✅ Le formulaire s'affiche correctement avec les 4 étapes
- ✅ La validation bloque la soumission si URL invalide
- ✅ Le projet est créé en base avec les 7 steps "pending"
- ✅ Le dossier storage/ est créé
- ✅ La redirection fonctionne
- ✅ Le projet apparaît sur le dashboard `/`

---

## PHASE 2 — Pipeline engine & Scraping

**Objectif global** : Le pipeline s'exécute, le scraping fonctionne, le dashboard montre la progression en temps réel.

---

### Partie 2.1 — Pipeline engine avec BullMQ

**Dépendances** : Phase 1 complète

**Ce qu'il faut faire** :
1. Installer et configurer BullMQ avec Redis
2. Créer la classe PipelineEngine qui orchestre les 7 étapes
3. Créer l'API route POST `/api/pipeline/start` pour lancer un pipeline
4. Créer les workers BullMQ (un par étape)
5. Mettre à jour le status en base à chaque transition
6. Gestion d'erreurs : retry 3x, puis status "error"

**Architecture** :

```typescript
// lib/pipeline/engine.ts
class PipelineEngine {
  async start(projectId: string): Promise<void>     // Lance l'étape 1
  async runStep(projectId: string, step: number): Promise<void>  // Exécute une étape
  async retryStep(projectId: string, step: number): Promise<void> // Relance une étape
  async getStatus(projectId: string): Promise<PipelineStatus>
}

// lib/pipeline/workers/
// step-1-scraping.worker.ts
// step-2-analysis.worker.ts
// step-3-inspiration.worker.ts
// step-4-architecture.worker.ts
// step-5-design.worker.ts
// step-6-generation.worker.ts
// step-7-preview.worker.ts
```

**Chaque worker** :
1. Met le step à "running" en base
2. Exécute la logique de l'étape (stub pour l'instant sauf étape 1)
3. Sauvegarde l'artefact JSON dans `storage/projects/{id}/artifacts/`
4. Met le step à "done" en base
5. Déclenche le step suivant (sauf step 7)

**Dépendances à installer** :
```
bullmq ioredis
```

**Critères de validation** :
- ✅ `POST /api/pipeline/start` crée les jobs BullMQ
- ✅ Les étapes s'enchaînent séquentiellement (1→2→3→...→7)
- ✅ Les statuts sont mis à jour en base à chaque transition
- ✅ Si une étape échoue, elle retry 3x puis passe en "error"
- ✅ Le pipeline s'arrête proprement en cas d'erreur
- ✅ Tests unitaires du PipelineEngine passent

---

### Partie 2.2 — Dashboard temps réel (SSE)

**Dépendances** : Partie 2.1 terminée

**Ce qu'il faut faire** :
1. Créer l'API route GET `/api/pipeline/[projectId]/events` (Server-Sent Events)
2. Créer le composant `<PipelineDashboard />` sur `/projects/[id]`
3. Afficher les 7 étapes avec leur statut en temps réel
4. Afficher les logs du pipeline en streaming
5. Boutons : "Lancer", "Relancer l'étape X", "Arrêter"

**UI du dashboard** :

```
┌─────────────────────────────────────────────────┐
│  Projet : example.com                           │
│  Status : En cours (étape 3/7)                  │
│                                                  │
│  ● Étape 1 — Scraping         ✅ Done (12s)     │
│  ● Étape 2 — Analyse          ✅ Done (8s)      │
│  ● Étape 3 — Inspiration      🔄 Running...     │
│  ○ Étape 4 — Architecture     ⏳ Pending        │
│  ○ Étape 5 — Design System    ⏳ Pending        │
│  ○ Étape 6 — Génération       ⏳ Pending        │
│  ○ Étape 7 — Preview          ⏳ Pending        │
│                                                  │
│  [Relancer étape 3] [Arrêter le pipeline]       │
│                                                  │
│  ─── Logs ────────────────────────────────────  │
│  14:23:01 [INFO] Scraping page /about...        │
│  14:23:03 [INFO] Found 3 forms on /contact      │
│  14:23:05 [INFO] Scraping complete: 12 pages    │
│  14:23:06 [INFO] Starting analysis...           │
└─────────────────────────────────────────────────┘
```

**Critères de validation** :
- ✅ La page `/projects/[id]` affiche le dashboard
- ✅ Les statuts se mettent à jour en temps réel (SSE)
- ✅ Les logs s'affichent en streaming
- ✅ Le bouton "Relancer" fonctionne sur une étape en erreur
- ✅ L'UI est responsive et lisible

---

### Partie 2.3 — Étape 1 : Scraping avec Playwright + Cheerio + Vision

**Dépendances** : Partie 2.1 terminée

**Ce qu'il faut faire** :
1. Implémenter le worker `step-1-scraping`
2. Crawler récursif limité au domaine source (max 50 pages)
3. Pour chaque page : extraire titre, meta, headings, texte par section, images, liens, formulaires
4. **Capturer des screenshots scrollés de chaque page** (viewport complet, scrollé par segments)
5. Détecter la navigation (header, footer, menus)
6. Télécharger et stocker les images dans MinIO
7. Extraire les couleurs dominantes et fonts
8. Produire l'artefact `01-scraping.json` validé par Zod

**Stratégie de capture screenshots pour la Vision IA** :

Playwright fait des full-page screenshots natifs. On capture chaque page en segments scrollés pour que Claude Vision puisse analyser le design, le layout, et l'UX :

```typescript
// Capture full-page screenshot avec Playwright
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(url, { waitUntil: 'networkidle' });

// Screenshot full-page (Playwright gère le scroll automatiquement)
const fullPageBuffer = await page.screenshot({ 
  fullPage: true, 
  type: 'png' 
});

// Découpage en tiles de 1072x1072 (taille optimale pour Claude Vision)
// Avec sharp pour le découpage
const tiles = await splitIntoTiles(fullPageBuffer, 1072, 1072);

// Stocker les screenshots dans MinIO
for (const [index, tile] of tiles.entries()) {
  await storage.upload(
    'scraped-assets',
    `${projectId}/screenshots/${slug}-tile-${index}.png`,
    tile,
    'image/png'
  );
}

// Également un screenshot viewport-only (above the fold)
const heroScreenshot = await page.screenshot({ type: 'png' }); // pas fullPage
```

**Pourquoi 1072×1072** : c'est la résolution optimale pour l'API Vision de Claude (1.15 mégapixels). Au-delà, les images sont redimensionnées et on perd en qualité d'analyse. En-deçà, on gaspille de la capacité.

**Pour chaque page, on stocke** :
- `hero-screenshot.png` — Above the fold uniquement (ce que l'utilisateur voit en premier)
- `full-page-tile-0.png`, `full-page-tile-1.png`, ... — Page complète découpée en segments
- Les tiles sont ordonnées de haut en bas pour reconstituer la page

**Outils** :
- Playwright : chargement des pages (JavaScript rendu) + screenshots natifs
- Cheerio : parsing HTML rapide post-rendu
- sharp : download + optimisation images + **découpage en tiles**
- @mozilla/readability : extraction du contenu principal
- colorthief : extraction couleurs dominantes

**Schéma Zod de l'artefact** :
```typescript
const ScrapingArtifactSchema = z.object({
  sourceUrl: z.string().url(),
  scrapedAt: z.string().datetime(),
  pages: z.array(z.object({
    url: z.string(),
    title: z.string(),
    metaDescription: z.string().nullable(),
    headings: z.array(z.object({ level: z.number(), text: z.string() })),
    sections: z.array(z.object({
      type: z.enum(['hero', 'content', 'features', 'testimonials', 'cta', 'faq', 'gallery', 'contact', 'other']),
      heading: z.string().nullable(),
      text: z.string(),
      images: z.array(z.string()),  // URLs MinIO
    })),
    forms: z.array(z.object({
      id: z.string(),
      action: z.string().nullable(),
      method: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        label: z.string().nullable(),
        required: z.boolean(),
      })),
    })),
    links: z.array(z.object({ href: z.string(), text: z.string(), isInternal: z.boolean() })),
    screenshots: z.object({
      hero: z.string(),                // URL MinIO — above the fold
      tiles: z.array(z.string()),      // URLs MinIO — full page découpée en tiles 1072x1072
    }),
  })),
  navigation: z.object({
    header: z.array(z.object({ label: z.string(), href: z.string(), children: z.array(z.any()).optional() })),
    footer: z.array(z.object({ label: z.string(), href: z.string() })),
  }),
  assets: z.object({
    logo: z.string().nullable(),       // URL MinIO
    favicon: z.string().nullable(),
    colors: z.array(z.string()),       // Hex codes dominants
    fonts: z.array(z.string()),        // Noms de polices détectées
  }),
})
```

**Dépendances à installer** :
```
playwright cheerio @mozilla/readability sharp colorthief jsdom
```

**Critères de validation** :
- ✅ Scraper un site réel (ex: un site vitrine simple) sans erreur
- ✅ L'artefact JSON est valide selon le schéma Zod
- ✅ Les images sont stockées dans MinIO (bucket `scraped-assets`)
- ✅ La navigation est correctement détectée
- ✅ Les formulaires sont détectés avec leurs champs
- ✅ Le scraping respecte la limite de 50 pages
- ✅ Tests avec des fixtures HTML statiques passent

---

### Partie 2.4 — Viewer d'artefacts JSON

**Dépendances** : Partie 2.3 terminée

**Ce qu'il faut faire** :
1. Créer un composant `<ArtifactViewer />` affichant un artefact JSON de manière lisible
2. Ajouter un onglet/section dans le dashboard pour chaque artefact disponible
3. Mode lecture avec mise en forme (pas juste du JSON brut)
4. Mode édition avec éditeur JSON (pour modifier manuellement un artefact)
5. Bouton "Sauvegarder" qui écrit le JSON modifié et permet de relancer l'étape suivante

**Critères de validation** :
- ✅ Chaque étape terminée affiche son artefact dans le dashboard
- ✅ L'artefact est affiché de manière lisible (pas juste du JSON brut)
- ✅ Le mode édition permet de modifier et sauvegarder
- ✅ Après modification, on peut relancer l'étape suivante

---

## PHASE 3 — Étapes d'analyse IA

**Objectif global** : Les étapes 2 à 5 fonctionnent via l'API Anthropic et produisent des artefacts structurés.

---

### Partie 3.1 — Service d'appel Anthropic + Étape 2 (Analyse avec Vision)

**Dépendances** : Phase 2 complète

**Ce qu'il faut faire** :
1. Créer le service Anthropic réutilisable (`lib/ai/anthropic.ts`) avec support texte + images
2. Implémenter le worker `step-2-analysis`
3. Écrire le prompt structuré pour l'analyse **en combinant données structurées + screenshots**
4. Définir le schéma Zod de l'artefact `02-analysis.json`
5. Parser et valider la réponse Claude
6. Tests avec des fixtures (artefact 01 mockés)

**Service Anthropic avec support Vision** :
```typescript
// lib/ai/anthropic.ts
interface AIService {
  // Analyse texte seul
  analyze(systemPrompt: string, userPrompt: string, outputSchema: z.ZodSchema): Promise<any>
  
  // Analyse avec images (Vision) — NOUVEAU
  analyzeWithVision(
    systemPrompt: string, 
    userPrompt: string, 
    images: { data: Buffer, mediaType: 'image/png' | 'image/jpeg' }[],
    outputSchema: z.ZodSchema
  ): Promise<any>
  
  // Gère : retry, parsing JSON, validation Zod, logging tokens
}
```

**Stratégie d'analyse hybride (texte + vision)** :

L'analyse utilise DEUX sources complémentaires :
1. **Données structurées** (artefact 01) → headings, textes, formulaires, liens, navigation
2. **Screenshots** (tiles 1072×1072) → design, layout, couleurs réelles, hiérarchie visuelle, UX

```typescript
// Construire le message avec texte + images
const messages = [
  {
    role: 'user',
    content: [
      // 1. Données structurées en texte
      { type: 'text', text: `Données scrapées du site :\n${JSON.stringify(scrapingData)}` },
      
      // 2. Screenshots hero des pages principales (above the fold)
      ...heroScreenshots.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: img.toString('base64') }
      })),
      
      // 3. Instruction d'analyse
      { type: 'text', text: `
        Analyse ce site en combinant les données structurées ET les screenshots.
        Les screenshots montrent le design réel — utilise-les pour évaluer :
        - La qualité visuelle et la modernité du design
        - La hiérarchie visuelle (qu'est-ce qui attire l'oeil en premier)
        - L'utilisation de l'espace (trop dense ? trop vide ?)
        - La cohérence visuelle entre les pages
        - Les patterns de design (hero, cards, grilles, etc.)
        Produis un JSON suivant le schéma fourni.
      ` }
    ]
  }
];
```

**Quels screenshots envoyer (budget tokens)** :
- **Homepage hero** (above the fold) → TOUJOURS
- **2-3 pages clés** (hero de chaque) → selon le nombre de pages scrappées
- **Full tiles** → uniquement pour la page d'accueil (3-4 tiles max)
- Budget total recommandé : **max 8-10 images** par analyse (~1200 tokens/image)

**Artefact 02 — Contenu attendu** (enrichi par la vision) :
- Type d'entreprise et secteur
- Public cible
- Tone of voice (formel/casual/technique/friendly)
- Forces et faiblesses du site (3-5 chaque) — **incluant les aspects visuels**
- **Évaluation du design actuel** (modernité, cohérence, accessibilité visuelle)
- **Patterns de layout identifiés** (hero avec image/vidéo, grille de cards, etc.)
- Pages essentielles vs secondaires
- Features détectées (formulaires, e-commerce, blog, etc.)
- Baseline SEO (headings, metas, maillage)

**Critères de validation** :
- ✅ Le service Anthropic retourne un JSON valide depuis l'API
- ✅ Les images sont correctement envoyées en base64 à l'API
- ✅ L'artefact 02 est validé par son schéma Zod
- ✅ L'analyse mentionne des éléments visuels (couleurs, layout) qui ne sont PAS dans le HTML
- ✅ L'analyse est pertinente sur 3 sites tests différents
- ✅ Les tokens utilisés sont loggés (texte + images séparément)
- ✅ Le retry fonctionne en cas d'erreur API

---

### Partie 3.2 — Étape 3 (Analyse des inspirations avec Vision)

**Dépendances** : Partie 3.1 terminée

**Ce qu'il faut faire** :
1. Implémenter le worker `step-3-inspiration`
2. Scraper les sites d'inspiration (réutiliser le scraper de l'étape 1, version allégée)
3. **Capturer les screenshots hero + 2-3 tiles par site d'inspiration**
4. Envoyer à Claude pour analyse croisée **avec screenshots des deux côtés** (source + inspirations)
5. Produire l'artefact `03-inspiration.json`

**Analyse croisée visuelle** :

Le prompt d'inspiration reçoit les screenshots du site source ET des sites d'inspiration, permettant à Claude de comparer visuellement :

```typescript
// Le message combine screenshots source + inspirations
const content = [
  { type: 'text', text: 'SITE SOURCE :' },
  ...sourceHeroScreenshots.map(img => ({ type: 'image', source: { type: 'base64', ... } })),
  { type: 'text', text: `Données source : ${JSON.stringify(analysisArtifact)}` },
  
  { type: 'text', text: 'SITE INSPIRATION 1 :' },
  ...inspi1Screenshots.map(img => ({ type: 'image', source: { type: 'base64', ... } })),
  { type: 'text', text: `Données inspi 1 : ${JSON.stringify(inspi1Data)}` },
  
  // ... sites d'inspiration 2, 3...
  
  { type: 'text', text: `
    Compare visuellement le site source avec les sites d'inspiration.
    Pour chaque inspiration, identifie :
    - Les patterns de design à emprunter (hero style, card layouts, spacing)
    - Les choix typographiques et de couleurs intéressants
    - La façon dont ils structurent l'information visuellement
    - Ce qui les rend modernes/attractifs par rapport au site source
  ` }
];
```

**Budget images** : max 3-4 screenshots par site d'inspiration, hero uniquement. Avec 3 sites d'inspiration + le source = ~12-16 images total.

**Artefact 03 — Contenu attendu** :
- Pour chaque site d'inspiration : design patterns, couleurs, typo, structure des pages, éléments marquants **identifiés visuellement**
- Synthèse : ce qu'on retient de chaque inspiration et pourquoi
- **Recommandations visuelles concrètes** : "adopter le hero plein écran de l'inspi 1", "utiliser le système de cards de l'inspi 2", etc.
- Recommandations croisées avec le secteur et le public du site source

**Critères de validation** :
- ✅ Le scraping des sites d'inspiration fonctionne
- ✅ Les screenshots sont capturés et stockés pour chaque inspi
- ✅ L'artefact 03 est validé par son schéma Zod
- ✅ L'analyse croisée fait référence à des éléments visuels concrets
- ✅ Les recommandations sont actionnables (pas juste "améliorer le design")

---

### Partie 3.3 — Étape 4 (Architecture) + Étape 5 (Design System)

**Dépendances** : Partie 3.2 terminée

**Ce qu'il faut faire** :
1. Implémenter le worker `step-4-architecture`
2. Implémenter le worker `step-5-design`
3. Écrire les prompts structurés
4. Définir les schémas Zod des artefacts 04 et 05

**Artefact 04 — Architecture** :
- Arborescence du nouveau site (pages, slugs, hiérarchie)
- Pour chaque page : sections ordonnées avec type (hero, features, testimonials, etc.)
- Plan de contenu : textes à réécrire vs conserver
- Mapping des formulaires
- Liste des "content slots" → deviennent les Blocks Payload

**Artefact 05 — Design System** :
- Palette (primary, secondary, accent, neutral, success, warning, error)
- Typographies (headings font, body font, mono font + fallbacks)
- Spacing scale (base unit, scale)
- Border radius, shadows
- Tokens Tailwind prêts à injecter dans `tailwind.config.ts`
- Direction artistique en texte (guide pour la génération)

**Critères de validation** :
- ✅ Les artefacts 04 et 05 sont validés par leurs schémas Zod
- ✅ L'architecture contient au moins les pages scrappées + recommandations
- ✅ Les tokens Tailwind sont un objet JavaScript valide
- ✅ Le pipeline complet tourne de bout en bout (étapes 1→5, étapes 6-7 en stub)

---

## PHASE 4 — Génération de site

**Objectif global** : Claude Code génère un site Next.js + Payload CMS fonctionnel à partir des artefacts.

---

### Partie 4.1 — Template starter Next.js + Payload

**Dépendances** : Phase 3 complète

**Ce qu'il faut faire** :
1. Créer le template de base dans `templates/site-base/`
2. Projet Next.js 15 + Payload CMS 3 qui compile et tourne
3. Collections de base : Pages, Media, Navigation, Forms
4. Layout squelette (header, main, footer)
5. SectionRenderer dynamique
6. Configuration SQLite pour le dev/preview
7. CLAUDE.md pour guider la modification du template
8. Le template doit être copiable et fonctionnel immédiatement

**C'est la partie la plus critique** — ce template est la base de tous les sites générés. Il doit être rock-solid.

**Critères de validation** :
- ✅ `cp -r templates/site-base/ storage/projects/test/site/`
- ✅ `cd storage/projects/test/site/ && npm install && npm run dev` → le site tourne
- ✅ L'admin Payload est accessible sur `/admin`
- ✅ On peut créer une page avec des sections dans l'admin
- ✅ La page s'affiche correctement côté public
- ✅ Les tests passent

---

### Partie 4.2 — Intégration Claude Code CLI dans l'orchestrateur

**Dépendances** : Partie 4.1 terminée

**Ce qu'il faut faire** :
1. Créer le service `lib/pipeline/claude-code.ts` qui spawne Claude Code CLI
2. Fonctions pour exécuter un prompt avec accès au filesystem d'un projet
3. Gestion du timeout, des erreurs, des logs
4. Implémenter le worker `step-6-generation` qui orchestre les sous-étapes

**Sous-étapes de l'étape 6** (chacune = un appel Claude Code) :
```
6.1  Copier le template + appliquer les design tokens au tailwind.config.ts
6.2  Générer/modifier les collections Payload depuis l'artefact architecture
6.3  Générer les composants de section (un par un)
6.4  Assembler les pages
6.5  Rédiger les textes et seeder la base Payload
6.6  Configurer les formulaires (Form Builder)
6.7  Finitions (nav, footer, SEO, favicon)
```

**Critères de validation** :
- ✅ `claude -p "..."` est exécuté depuis l'orchestrateur
- ✅ Claude Code écrit des fichiers dans le bon dossier projet
- ✅ Les sous-étapes s'exécutent séquentiellement
- ✅ Les erreurs sont capturées et loggées
- ✅ Le dashboard montre la progression des sous-étapes

---

### Partie 4.3 — Bibliothèque de prompts de génération

**Dépendances** : Partie 4.2 terminée

**Ce qu'il faut faire** :
1. Écrire les prompts pour chaque sous-étape (6.1 à 6.7)
2. Chaque prompt reçoit les artefacts nécessaires en contexte
3. Chaque prompt a des critères de vérification (Claude doit tester son code)
4. Stocker les prompts dans `lib/pipeline/prompts/`
5. Tester sur 3-5 sites réels

**Fichiers à créer** :
```
lib/pipeline/prompts/
├── 6.1-design-tokens.ts
├── 6.2-collections.ts
├── 6.3-components.ts
├── 6.4-pages.ts
├── 6.5-content.ts
├── 6.6-forms.ts
└── 6.7-finitions.ts
```

**Critères de validation** :
- ✅ Chaque prompt est testé individuellement
- ✅ Le site généré compile sans erreur TypeScript
- ✅ Le site généré démarre avec `npm run dev`
- ✅ Les pages s'affichent avec du contenu
- ✅ L'admin Payload montre les collections et le contenu seedé
- ✅ Testé sur au moins 3 sites sources différents

---

## PHASE 5 — Preview Docker

**Objectif global** : Le site généré tourne dans un conteneur Docker accessible via le navigateur.

---

### Partie 5.1 — Lancement dynamique de conteneurs preview

**Dépendances** : Phase 4 complète

**Ce qu'il faut faire** :
1. Installer et configurer `dockerode`
2. Implémenter le worker `step-7-preview` qui crée un conteneur pour le site
3. Utiliser l'image `preview-base` préparée en 1.1
4. Monter le code source en volume
5. Configurer le label Traefik pour le routing dynamique
6. Stocker l'URL de preview en base

**Critères de validation** :
- ✅ Un conteneur est créé après l'étape 6
- ✅ Le site est accessible via `{projectId}.preview.localhost`
- ✅ L'admin Payload est accessible via `{projectId}.preview.localhost/admin`
- ✅ Le conteneur se stoppe proprement
- ✅ Gestion du cycle de vie (start, stop, restart, remove)

---

### Partie 5.2 — Interface preview dans le dashboard

**Dépendances** : Partie 5.1 terminée

**Ce qu'il faut faire** :
1. Créer la page `/projects/[id]/preview` avec un iframe sandboxé
2. Barre d'outils : responsive toggle (desktop/tablet/mobile), refresh, nouvel onglet
3. Boutons d'action : "Régénérer", "Exporter", "Modifier" (lien vers admin Payload)
4. Système de snapshots : sauvegarder une version avant modification

**Critères de validation** :
- ✅ L'iframe charge le site preview correctement
- ✅ Les toggles responsive fonctionnent (redimensionnent l'iframe)
- ✅ Le bouton "Modifier" ouvre l'admin Payload du site preview
- ✅ Le snapshot est créé et stocké dans MinIO

---

## PHASE 6 — Inline editing & CMS avancé

**Objectif global** : Le client peut modifier textes et images directement depuis la page.

---

### Partie 6.1 — Payload Live Preview

**Dépendances** : Phase 5 complète

**Ce qu'il faut faire** :
1. Configurer `livePreview` dans les collections Payload du template starter
2. Ajouter le composant `<RefreshRouteOnSave />` dans le layout frontend
3. Tester le split-screen dans l'admin Payload

**Critères de validation** :
- ✅ L'admin Payload affiche le site en preview à côté du formulaire d'édition
- ✅ Modifier un champ met à jour le preview en temps réel
- ✅ Fonctionne pour les textes et les images

---

### Partie 6.2 — Composant Editable et inline editing

**Dépendances** : Partie 6.1 terminée

**Ce qu'il faut faire** :
1. Créer le composant `<EditableWrapper />` dans le template starter
2. Créer `<InlineTextEditor />`, `<InlineRichTextEditor />`, `<InlineImageEditor />`
3. Hook `useInlineEdit` pour la logique de sauvegarde (PATCH API Payload)
4. Middleware Next.js pour détecter l'admin connecté
5. Intégrer dans les composants de section existants
6. Tests e2e (login admin → edit → save → verify)

**Critères de validation** :
- ✅ Visiteur normal : aucun bouton d'édition visible
- ✅ Admin connecté : overlay ✏️ sur chaque zone éditable
- ✅ Clic sur texte → édition inline → sauvegarde → page mise à jour (SSR)
- ✅ Clic sur image → upload → remplacement → page mise à jour
- ✅ Le SEO n'est pas impacté (contenu toujours SSR)
- ✅ Tests e2e passent

---

### Partie 6.3 — Storage S3 (MinIO) pour les médias Payload

**Dépendances** : Partie 6.2 terminée

**Ce qu'il faut faire** :
1. Configurer `@payloadcms/storage-s3` dans le template starter
2. Les images uploadées via Payload vont dans MinIO (`site-media-{projectId}`)
3. Les images sont servies via une URL MinIO signée ou un proxy
4. Mettre à jour les composants pour utiliser les URLs MinIO

**Critères de validation** :
- ✅ Upload via l'admin Payload stocke dans MinIO
- ✅ Upload via l'inline editing stocke dans MinIO
- ✅ Les images sont affichées correctement sur le site
- ✅ La suppression dans Payload supprime dans MinIO

---

## PHASE 7 — Export & itération

**Objectif global** : Le site peut être exporté, et l'utilisateur peut demander des modifications ciblées.

---

### Partie 7.1 — Export ZIP et Dockerfile de production

**Dépendances** : Phase 6 complète

**Ce qu'il faut faire** :
1. Créer l'API route `POST /api/projects/[id]/export`
2. Générer un Dockerfile de production dans le projet
3. Créer une archive ZIP du projet complet
4. Stocker le ZIP dans MinIO (bucket `exports`)
5. Fournir un lien de téléchargement signé
6. Inclure un README auto-généré dans le ZIP (comment déployer, utiliser l'admin, etc.)

**Critères de validation** :
- ✅ Le bouton "Exporter" génère un ZIP
- ✅ Le ZIP contient un projet complet qui compile
- ✅ `docker build` fonctionne avec le Dockerfile inclus
- ✅ Le README est clair et complet
- ✅ Le lien de téléchargement fonctionne

---

### Partie 7.2 — Push Git automatique

**Dépendances** : Partie 7.1 terminée

**Ce qu'il faut faire** :
1. Ajouter un champ "GitHub/GitLab repo URL" au projet
2. Initialiser un repo git dans le projet généré
3. Push automatique vers le repo distant (via token d'accès)
4. Option : créer le repo automatiquement via API GitHub

**Critères de validation** :
- ✅ Le push vers GitHub/GitLab fonctionne
- ✅ Le repo contient le projet complet avec historique
- ✅ Le README et le Dockerfile sont inclus

---

### Partie 7.3 — Système de feedback et régénération partielle

**Dépendances** : Partie 7.1 terminée

**Ce qu'il faut faire** :
1. Interface de feedback dans la page preview : sélectionner une zone + décrire le changement
2. Stocker les feedbacks en base (collection `feedbacks`)
3. Mécanisme de régénération partielle : relancer une sous-étape spécifique de l'étape 6
4. Par exemple : "Régénère juste le composant Hero avec ce feedback"
5. Le snapshot est créé automatiquement avant chaque régénération

**Critères de validation** :
- ✅ L'utilisateur peut annoter une zone du site et décrire un changement
- ✅ La régénération partielle ne casse pas le reste du site
- ✅ Un snapshot est créé avant la régénération
- ✅ On peut revenir à un snapshot précédent

---

## PHASE 8 — Polish et robustesse

**Objectif global** : Le produit est fiable, testé, et prêt pour une utilisation réelle.

---

### Partie 8.1 — Gestion d'erreurs et resilience

**Dépendances** : Phase 7 complète

**Ce qu'il faut faire** :
1. Error boundaries React sur toutes les pages
2. Retry exponential backoff sur les appels API Anthropic
3. Rate limiting sur les API routes de l'orchestrateur
4. Timeout configurable par étape du pipeline
5. Fallback gracieux : si la preview Docker plante → screenshot statique
6. Logging structuré avec niveaux (info, warn, error, debug)

**Critères de validation** :
- ✅ Un site qui ne peut pas être scrapé affiche un message clair
- ✅ Un échec API Anthropic est retryé automatiquement
- ✅ Les timeout empêchent les étapes de tourner indéfiniment
- ✅ Les logs sont exploitables pour le debugging

---

### Partie 8.2 — Nettoyage automatique et monitoring

**Dépendances** : Partie 8.1 terminée

**Ce qu'il faut faire** :
1. Cron job : supprimer les conteneurs preview inactifs depuis >24h
2. Cron job : supprimer les projets abandonnés depuis >7j
3. Purger les buckets MinIO des fichiers orphelins
4. Dashboard de monitoring : nombre de projets, conteneurs actifs, espace disque, tokens consommés
5. Limite configurable : max X projets simultanés, max Y conteneurs

**Critères de validation** :
- ✅ Les conteneurs inactifs sont supprimés automatiquement
- ✅ L'espace disque est contrôlé
- ✅ Le dashboard de monitoring affiche les métriques

---

### Partie 8.3 — Tests end-to-end et validation sur sites réels

**Dépendances** : Partie 8.2 terminée

**Ce qu'il faut faire** :
1. Suite de tests e2e Playwright sur l'orchestrateur complet
2. Tester le workflow complet : formulaire → pipeline → preview → export
3. Tester sur 10-20 sites réels de types variés (vitrine, SaaS, restaurant, cabinet médical, etc.)
4. Documenter les cas qui échouent et ajuster les prompts
5. Mesurer et optimiser les temps d'exécution par étape
6. Documenter le taux de succès par type de site

**Critères de validation** :
- ✅ Tests e2e passent sur le workflow complet
- ✅ Au moins 70% de taux de succès sur 20 sites variés
- ✅ Les prompts sont optimisés en fonction des résultats
- ✅ Les temps d'exécution sont documentés

---

### Partie 8.4 — UI/UX polish final

**Dépendances** : Partie 8.3 terminée

**Ce qu'il faut faire** :
1. Polish de l'interface du dashboard (animations, transitions, empty states)
2. Messages d'erreur user-friendly partout
3. Onboarding : tooltip ou guide au premier usage
4. Page de résultats : comparaison avant/après (screenshot site original vs site généré)
5. Dark mode (optionnel)
6. Responsive sur mobile (le dashboard au minimum)

**Critères de validation** :
- ✅ L'interface est agréable et professionnelle
- ✅ Les messages d'erreur sont compréhensibles
- ✅ La navigation est intuitive sans documentation
- ✅ L'app est utilisable sur tablette

---

## Récapitulatif des parties

| Partie | Nom | Dépend de | Complexité |
|---|---|---|---|
| **1.1** | Structure projet + Docker Compose | — | ⭐⭐ |
| **1.2** | App Next.js orchestrateur | 1.1 | ⭐⭐ |
| **1.3** | PostgreSQL + Drizzle ORM | 1.2 | ⭐⭐ |
| **1.4** | MinIO + service stockage | 1.2 | ⭐⭐ |
| **1.5** | Formulaire création projet | 1.3, 1.4 | ⭐⭐⭐ |
| **2.1** | Pipeline engine BullMQ | Phase 1 | ⭐⭐⭐ |
| **2.2** | Dashboard temps réel SSE | 2.1 | ⭐⭐⭐ |
| **2.3** | Scraping Playwright + Cheerio | 2.1 | ⭐⭐⭐⭐ |
| **2.4** | Viewer d'artefacts | 2.3 | ⭐⭐ |
| **3.1** | Service Anthropic + Analyse | Phase 2 | ⭐⭐⭐ |
| **3.2** | Analyse des inspirations | 3.1 | ⭐⭐⭐ |
| **3.3** | Architecture + Design System | 3.2 | ⭐⭐⭐ |
| **4.1** | Template starter Next.js + Payload | Phase 3 | ⭐⭐⭐⭐⭐ |
| **4.2** | Intégration Claude Code CLI | 4.1 | ⭐⭐⭐⭐ |
| **4.3** | Bibliothèque de prompts | 4.2 | ⭐⭐⭐⭐⭐ |
| **5.1** | Conteneurs preview Docker | Phase 4 | ⭐⭐⭐⭐ |
| **5.2** | Interface preview (iframe) | 5.1 | ⭐⭐⭐ |
| **6.1** | Payload Live Preview | Phase 5 | ⭐⭐ |
| **6.2** | Inline editing | 6.1 | ⭐⭐⭐⭐ |
| **6.3** | Storage S3 MinIO pour Payload | 6.2 | ⭐⭐ |
| **7.1** | Export ZIP + Dockerfile | Phase 6 | ⭐⭐⭐ |
| **7.2** | Push Git automatique | 7.1 | ⭐⭐ |
| **7.3** | Feedback + régénération partielle | 7.1 | ⭐⭐⭐⭐ |
| **8.1** | Gestion d'erreurs + resilience | Phase 7 | ⭐⭐⭐ |
| **8.2** | Nettoyage auto + monitoring | 8.1 | ⭐⭐⭐ |
| **8.3** | Tests e2e + validation sites réels | 8.2 | ⭐⭐⭐⭐ |
| **8.4** | UI/UX polish | 8.3 | ⭐⭐⭐ |

**Total : 26 parties sur 8 phases**

---

## Comment utiliser avec Claude Code

### Pour développer une partie :

```bash
# Ouvrir Claude Code dans le projet
cd sitebuilder
claude

# Dire :
"Développe la partie 2.3 du projet SiteRebuilder.
Lis ROADMAP.md section 'Partie 2.3' pour les instructions détaillées.
Lis aussi CLAUDE.md et agent_docs/scraping-strategy.md pour le contexte.
Commence par écrire les tests, puis implémente."
```

### Pour vérifier qu'une partie est terminée :

```bash
"Vérifie les critères de validation de la partie 2.3 dans ROADMAP.md.
Exécute chaque vérification et dis-moi lesquelles passent ou échouent."
```

### Pour reprendre après une pause :

```bash
"Lis ROADMAP.md et vérifie quelles parties sont terminées en checkant
les critères de validation. Dis-moi quelle est la prochaine partie à développer."
```
