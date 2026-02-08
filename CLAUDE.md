# SiteRebuilder

## Qu'est-ce que c'est

Pipeline automatisé qui prend un site web existant + des sites d'inspiration et génère automatiquement un nouveau site **Next.js 15 + Payload CMS 3** complet, avec CMS intégré, prêt à être prévisualisé et validé avant mise en production.

## Stack technique

| Composant | Solution |
|---|---|
| **Orchestrateur** | Next.js 15, App Router, TypeScript strict, Tailwind 4, shadcn/ui |
| **Sites générés** | Next.js 15 + Payload CMS 3 + Tailwind 4 + SQLite (dev) / PostgreSQL (prod) |
| **Infra** | Docker Compose, Traefik, PostgreSQL 17, Redis 7, MinIO |
| **Job Queue** | BullMQ + ioredis |
| **IA Analyse** | API Anthropic (Claude Sonnet) |
| **IA Génération** | Claude Code CLI (`claude -p`) |
| **Scraping** | Playwright + Cheerio + sharp + @mozilla/readability |
| **Validation** | Zod pour TOUT (artefacts, API, formulaires) |

## Structure du projet

```
sitebuilder/
├── CLAUDE.md                    # Ce fichier
├── docker-compose.yml           # Orchestration des services
├── .env.example                 # Variables d'environnement
├── apps/
│   └── orchestrator/            # App Next.js principale
│       ├── CLAUDE.md            # Conventions spécifiques orchestrateur
│       └── src/
├── templates/
│   └── site-base/               # Template de base pour les sites générés
│       └── CLAUDE.md            # Conventions pour modifier le template
├── storage/
│   └── projects/                # Projets générés (gitignored)
├── docker/
│   ├── orchestrator/Dockerfile
│   └── preview-base/Dockerfile
└── agent_docs/                  # Documentation détaillée par domaine
    ├── foundations-site-rebuilder-v2.md
    ├── pipeline-architecture.md
    ├── docker-management.md
    ├── payload-cms-patterns.md
    ├── scraping-strategy.md
    └── prompt-engineering.md
```

## Commandes essentielles

```bash
docker compose up -d              # Démarrer l'infra
docker compose ps                 # Vérifier les services
npm run dev -w orchestrator       # Dev orchestrateur
npm run test                      # Tests
npm run lint                      # Lint + typecheck
npm run db:generate               # Générer migrations Drizzle
npm run db:migrate                # Appliquer migrations
npm run db:seed                   # Seeder données de test
```

## URLs locales

- `http://app.localhost` → Orchestrateur
- `http://storage.localhost` → Console MinIO
- `http://{projectId}.preview.localhost` → Preview d'un site généré

## Pipeline en 7 étapes

Chaque étape produit un **artefact JSON validé par Zod** :

1. **Scraping** → `01-scraping.json` (structure, textes, images, screenshots)
2. **Analyse** → `02-analysis.json` (type de business, forces/faiblesses, ton)
3. **Inspiration** → `03-inspiration.json` (patterns design, recommandations)
4. **Architecture** → `04-architecture.json` (arborescence, sections, content slots)
5. **Design System** → `05-design.json` (couleurs, typo, tokens Tailwind)
6. **Génération** → Projet Next.js + Payload complet
7. **Preview** → Conteneur Docker live

Pour les détails, lire `agent_docs/pipeline-architecture.md`

## Conventions de code

### TypeScript
- Strict mode, **zéro `any`**
- Imports absolus avec `@/` prefix
- Types exportés depuis les fichiers de schéma

### React / Next.js
- **Server Components par défaut**
- `"use client"` uniquement si nécessaire (état, events, hooks browser)
- App Router patterns (pas de pages/)

### Validation
- **Zod pour TOUTE validation** : artefacts, API, formulaires
- Schémas colocalisés avec les entités

### Tests
- Colocalisés : `feature.ts` → `feature.test.ts`
- TDD : tests d'abord, implémentation ensuite
- Vitest pour unit/integration, Playwright pour e2e

### Nommage
- Components : PascalCase (`HeroSection.tsx`)
- Hooks : camelCase avec `use` (`useInlineEdit.ts`)
- Utils : camelCase (`formatDate.ts`)
- Artefacts : `XX-step-name.json` (numérotés)

## Patterns à NE PAS utiliser

- Ne pas utiliser `fetch` côté client pour les données CMS → Server Components
- Ne pas créer de fichiers sans les lire d'abord si existants
- Ne pas désactiver un test qui échoue → le corriger
- Ne pas utiliser `localStorage` dans les composants preview
- Ne pas créer de multi-agent systems complexes
- Ne pas écrire de code avant d'avoir un plan approuvé

## Workflow de développement

Suivre le pattern **Explore → Plan → Code → Verify** :

1. **EXPLORE** — Lire le code existant, comprendre le contexte
2. **PLAN** — Proposer un plan d'implémentation (activer Plan Mode)
3. **REVIEW** — Validation ou correction du plan
4. **CODE** — Implémenter selon le plan, tests d'abord
5. **VERIFY** — Vérifier que les tests passent et le build est OK
6. **COMMIT** — Commit avec message clair

## Documentation détaillée

| Domaine | Fichier |
|---|---|
| Architecture complète | `agent_docs/foundations-site-rebuilder-v2.md` |
| Pipeline détaillé | `agent_docs/pipeline-architecture.md` |
| Gestion Docker | `agent_docs/docker-management.md` |
| Patterns Payload CMS | `agent_docs/payload-cms-patterns.md` |
| Stratégie scraping | `agent_docs/scraping-strategy.md` |
| Prompts IA | `agent_docs/prompt-engineering.md` |

## Roadmap

Le développement suit 8 phases (26 parties). Voir `sitebuilder-roadmap.md` pour les détails.

**Phase actuelle : Phase 1 — Socle technique**

Prochaine partie à développer : **Partie 1.1 — Structure du projet et Docker Compose**

## Quand tu fais une erreur

1. **TOUJOURS lire l'erreur complète** avant de tenter un fix
2. Ne jamais désactiver un test qui échoue
3. Si le build échoue, ne pas empiler les fixes — comprendre d'abord
4. Documenter dans ce fichier les erreurs récurrentes pour éviter de les répéter