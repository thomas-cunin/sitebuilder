# SiteRebuilder — Guide d'optimisation Claude Code

## Addendum au document de fondations v2

Ce document synthétise les meilleures pratiques issues de 12+ sources (documentation officielle Anthropic, retours d'expérience de 6 mois d'utilisation intensive, guides communautaires) pour optimiser le développement de SiteRebuilder avec Claude Code.

---

## 1. Principe fondamental : la fenêtre de contexte

Tout repose sur une contrainte unique : **la fenêtre de contexte se remplit vite, et la qualité se dégrade quand elle se remplit**. Chaque fichier lu, chaque commande exécutée, chaque message consomme des tokens. Au-delà de 60-70% de remplissage, Claude commence à "oublier" les instructions antérieures et à faire plus d'erreurs.

**Conséquence directe pour SiteRebuilder** : le projet est trop gros pour une seule session. Il faut le découper en tâches isolées, chacune réalisable dans un contexte "frais". La gestion du contexte n'est pas un détail technique — c'est LA compétence qui sépare un développement chaotique d'un développement fluide.

---

## 2. Structure CLAUDE.md — Le cerveau permanent du projet

### 2.1 Pourquoi c'est le fichier le plus important

Le `CLAUDE.md` est lu à chaque session. C'est la mémoire persistante de Claude Code sur le projet. Un mauvais CLAUDE.md produit du mauvais code partout. Un bon CLAUDE.md transforme Claude en développeur senior qui connaît le projet.

### 2.2 Architecture hiérarchique recommandée pour SiteRebuilder

```
sitebuilder/
├── CLAUDE.md                          # Racine — Vue d'ensemble projet (150-200 lignes max)
├── apps/
│   └── orchestrator/
│       ├── CLAUDE.md                  # Spécifique orchestrateur (100 lignes)
│       └── src/
│           ├── pipeline/
│           │   └── CLAUDE.md          # Spécifique pipeline engine
│           └── components/
│               └── CLAUDE.md          # Conventions UI
├── templates/
│   └── site-base/
│       └── CLAUDE.md                  # Conventions pour les sites générés
└── agent_docs/                        # Documentation progressive (détail à la demande)
    ├── pipeline-architecture.md
    ├── docker-management.md
    ├── payload-cms-patterns.md
    ├── scraping-strategy.md
    ├── prompt-engineering.md
    └── inline-editing.md
```

### 2.3 Contenu du CLAUDE.md racine

Le CLAUDE.md racine doit contenir le **WHAT** (qu'est-ce que le projet), le **WHY** (pourquoi les décisions architecturales) et le **HOW** (comment travailler dessus). Il ne doit PAS contenir toute la documentation — il doit pointer vers les fichiers détaillés.

```markdown
# SiteRebuilder

## Qu'est-ce que c'est
Pipeline automatisé qui prend un site web + des inspirations et génère un 
nouveau site Next.js + Payload CMS complet.

## Stack technique
- Orchestrateur : Next.js 15, App Router, TypeScript strict
- Sites générés : Next.js 15 + Payload CMS 3 + Tailwind 4
- Infra : Docker Compose, Traefik, PostgreSQL, Redis, MinIO
- IA : Claude Code CLI + API Anthropic (Sonnet pour analyse, Code pour génération)

## Structure du projet
apps/orchestrator/     → App Next.js principale (formulaire, dashboard, API)
templates/site-base/   → Template de base pour les sites générés
storage/projects/      → Projets en cours (artefacts + sites)
agent_docs/            → Documentation détaillée par domaine

## Commandes essentielles
docker compose up -d           # Démarrer l'infra
npm run dev -w orchestrator    # Dev orchestrateur
npm run test                   # Tests
npm run lint                   # Lint + typecheck
npm run pipeline:test          # Tests e2e du pipeline

## Conventions de code
- TypeScript strict, pas de any
- Server Components par défaut, "use client" uniquement si nécessaire
- Zod pour TOUTE validation (artefacts, API, formulaires)
- Imports absolus avec @/ prefix
- Tests colocalisés : feature.ts → feature.test.ts

## Architecture pipeline
7 étapes séquentielles, chaque étape produit un artefact JSON validé par Zod.
Pour les détails, lire agent_docs/pipeline-architecture.md

## Patterns à NE PAS utiliser
- ❌ Ne pas utiliser fetch côté client pour les données CMS (Server Components)
- ❌ Ne pas utiliser WidthType.PERCENTAGE dans les tableaux docx
- ❌ Ne pas créer de multi-agent systems complexes
- ❌ Ne pas utiliser localStorage dans les composants preview

## Quand tu fais une erreur
Si un build échoue, TOUJOURS lire l'erreur complète avant de tenter un fix.
Ne jamais désactiver un test qui échoue — le corriger.
```

### 2.4 Ce qu'il faut documenter vs ne pas documenter

**Documenter** (ce que Claude Code se trompe souvent) :
- Les commandes spécifiques au projet (pas les commandes npm standard)
- Les patterns architecturaux et POURQUOI on les a choisis
- Les anti-patterns à éviter (avec l'alternative correcte)
- Les conventions de nommage propres au projet
- Les chemins de fichiers importants

**Ne PAS documenter** :
- Les connaissances générales (Next.js basics, TypeScript syntax)
- Les règles de style gérées par le linter (ESLint/Prettier s'en chargent)
- Les secrets, clés API, connection strings
- L'historique des décisions (seulement les décisions actuelles)

### 2.5 Progressive Disclosure — Documentation à la demande

Au lieu de tout mettre dans CLAUDE.md, on utilise un dossier `agent_docs/` avec des fichiers ciblés. Le CLAUDE.md racine pointe vers eux :

```markdown
## Documentation détaillée
- Pour l'architecture du pipeline : agent_docs/pipeline-architecture.md
- Pour la gestion Docker : agent_docs/docker-management.md
- Pour les patterns Payload CMS : agent_docs/payload-cms-patterns.md
- Pour la stratégie de scraping : agent_docs/scraping-strategy.md
```

Claude Code lit ces fichiers **uniquement quand c'est pertinent**, au lieu de charger toute la documentation dans chaque session.

---

## 3. Workflow de développement — Plan → Code → Verify

### 3.1 Le workflow qui marche : Explore, Plan, Code, Commit

C'est le consensus de toutes les sources : **ne jamais laisser Claude Code coder avant d'avoir un plan approuvé**.

```
1. EXPLORE  → Claude lit le code existant, comprend le contexte
             "Lis les fichiers dans src/pipeline/ et explique l'architecture actuelle.
              Ne code rien."

2. PLAN     → Claude propose un plan d'implémentation
             (Activer Plan Mode avec Shift+Tab×2)
             "Propose un plan pour implémenter l'étape de scraping. 
              Inclus les fichiers à créer/modifier, les dépendances, 
              et les tests nécessaires."

3. REVIEW   → Tu valides ou corriges le plan
             "Le plan est bon sauf X. Modifie l'approche pour Y."

4. CODE     → Claude implémente selon le plan approuvé
             "Implémente le plan. Écris les tests d'abord.
              Fais un commit après chaque sous-étape."

5. VERIFY   → Claude vérifie son propre travail
             "Fais une code review de ce que tu viens d'écrire.
              Vérifie que les tests passent et que le build est OK."

6. COMMIT   → Commit avec message clair
```

### 3.2 Application au développement de SiteRebuilder

Pour chaque feature ou composant majeur du projet, créer un dossier de travail :

```
.claude/tasks/
├── pipeline-engine/
│   ├── plan.md          # Le plan approuvé
│   ├── context.md       # Fichiers clés, décisions prises
│   └── tasks.md         # Checklist des sous-tâches
├── scraping-step/
│   ├── plan.md
│   ├── context.md
│   └── tasks.md
└── payload-generation/
    ├── plan.md
    ├── context.md
    └── tasks.md
```

**Workflow par feature** :
1. Décrire la feature et demander un plan → Claude crée `plan.md`
2. Valider/modifier le plan
3. Claude code en suivant le plan, coche les items dans `tasks.md`
4. Si le contexte devient lourd → `/clear`, Claude relit `plan.md` et continue
5. Feature terminée → archiver le dossier task

### 3.3 Gestion du contexte en cours de session

```
Règle d'or : /clear à 60k tokens (30% du contexte) — ne pas attendre la limite

Pattern "Document & Clear" pour les tâches longues :
1. Claude écrit sa progression dans tasks.md
2. /clear pour vider le contexte
3. Nouvelle session : "Lis .claude/tasks/pipeline-engine/ et continue la tâche"
4. Claude reprend exactement où il s'était arrêté
```

**Pour SiteRebuilder spécifiquement**, les sessions longues seront :
- Génération des composants (Phase 4) → une session par composant, `/clear` entre chaque
- Configuration Payload (Phase 4) → session dédiée avec le plan des collections
- Inline editing (Phase 6) → session dédiée avec le plan d'architecture

---

## 4. Découpage du projet en tâches Claude Code

### 4.1 Principe : une tâche = un contexte

Chaque tâche doit être **réalisable dans un seul contexte** (idéalement <50k tokens consommés). Si une tâche semble trop grosse, la découper.

### 4.2 Découpage recommandé pour SiteRebuilder

#### Phase 1 — Socle technique
```
Tâche 1.1 : Scaffolding monorepo + Docker Compose
  → "Crée la structure du projet avec Docker Compose (orchestrator, postgres, redis, 
     minio, traefik). Utilise le plan dans agent_docs/docker-management.md"
  → /clear

Tâche 1.2 : Setup Next.js orchestrateur + config
  → "Initialise l'app Next.js dans apps/orchestrator avec App Router, 
     TypeScript strict, Tailwind, shadcn/ui"
  → /clear

Tâche 1.3 : Schéma PostgreSQL + Drizzle ORM
  → "Crée le schéma de base avec Drizzle : projets, pipeline_steps, users.
     Lis agent_docs/pipeline-architecture.md pour le modèle de données"
  → /clear

Tâche 1.4 : Formulaire multi-étapes
  → "Crée le formulaire de création de projet : URL source, URLs inspiration, 
     notes. Utilise React Hook Form + Zod. Tests inclus."
  → /clear
```

#### Phase 2 — Pipeline engine
```
Tâche 2.1 : BullMQ job queue + API routes
Tâche 2.2 : Dashboard temps réel (SSE)
Tâche 2.3 : Étape scraping (Playwright + Cheerio)
Tâche 2.4 : Artefact viewer JSON
```

#### Phase 3 — Étapes IA
```
Tâche 3.1 : Étape analyse (prompt + schéma Zod)
Tâche 3.2 : Étape inspiration (scraping inspi + analyse croisée)
Tâche 3.3 : Étape architecture (arborescence + content slots)
Tâche 3.4 : Étape design system (tokens Tailwind)
```

#### Phase 4 — Génération (la plus critique)
```
Tâche 4.1 : Template de base Next.js + Payload (le starter)
Tâche 4.2 : Générateur de collections Payload depuis artefact architecture
Tâche 4.3 : Générateur de composants (section par section)
Tâche 4.4 : Générateur de pages (assemblage)
Tâche 4.5 : Générateur de contenus (rédaction + seed Payload)
Tâche 4.6 : Générateur de formulaires
Tâche 4.7 : Finitions (nav, footer, SEO, Dockerfile)
```

Chaque tâche est autonome. Si le contexte sature en cours de tâche → Document & Clear.

---

## 5. Test-Driven Development avec Claude Code

### 5.1 Pourquoi c'est encore plus critique avec l'IA

Le code généré par IA "marche" souvent en surface mais contient des bugs subtils. Les tests sont **le seul mécanisme de validation fiable**. Sans tests, tu n'as aucune garantie que le code fait ce qu'il prétend.

### 5.2 Workflow TDD pour SiteRebuilder

```
1. Écrire le test AVANT l'implémentation
   → "Écris les tests pour la fonction scrapePage(url) qui doit extraire
      le titre, les headings, le texte par section, et les images.
      NE code PAS la fonction, juste les tests."

2. Vérifier que les tests échouent
   → "Exécute les tests. Confirme qu'ils échouent."

3. Committer les tests séparément
   → "Commite les tests avec le message: test: add scrapePage tests"

4. Implémenter jusqu'à ce que les tests passent
   → "Implémente scrapePage pour faire passer tous les tests.
      Ne modifie PAS les tests."

5. Ne JAMAIS modifier un test pendant l'implémentation
   → Si un test semble "faux", c'est que le test documente le bon comportement.
      L'implémentation doit s'y conformer.
```

### 5.3 Tests spécifiques au projet

| Composant | Type de test | Outil |
|---|---|---|
| Pipeline engine | Tests unitaires + intégration | Vitest |
| Scraping | Tests avec fixtures HTML | Vitest + fichiers HTML statiques |
| Artefacts Zod | Tests de schéma (valid + invalid) | Vitest + Zod |
| Prompts IA | Tests snapshot des outputs | Vitest + mocks API |
| Composants UI | Tests de rendering | Vitest + Testing Library |
| API routes | Tests d'intégration | Vitest + supertest |
| Sites générés | Tests e2e | Playwright |

---

## 6. Hooks et quality gates automatiques

### 6.1 Hooks recommandés pour SiteRebuilder

Les hooks sont des scripts qui s'exécutent automatiquement avant/après certaines actions de Claude Code. Ils servent de filet de sécurité.

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx tsc --noEmit --pretty 2>&1 | head -20",
        "description": "Type-check après chaque modification de fichier"
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash(git commit:*)",
        "command": "npm run test -- --reporter=silent 2>&1 | tail -5",
        "description": "Vérifier que les tests passent avant chaque commit"
      }
    ]
  }
}
```

### 6.2 Quality gates du pipeline de développement

```
Avant chaque commit :
  ✅ TypeScript compile sans erreur
  ✅ Tous les tests passent
  ✅ ESLint + Prettier OK
  ✅ Les schémas Zod des artefacts sont valides

Avant chaque PR :
  ✅ Build complet réussit
  ✅ Tests e2e passent
  ✅ Pas de console.log oubliés
  ✅ Pas de TODO non résolu
```

---

## 7. Slash commands personnalisées

Les slash commands sont des raccourcis pour les actions fréquentes. Elles réduisent le context switching et garantissent la cohérence.

### 7.1 Commands recommandées pour SiteRebuilder

```
/.claude/commands/

dev-plan.md        → "Crée un plan de développement pour la feature décrite, 
                      stocke-le dans .claude/tasks/{nom}/plan.md"

pipeline-test.md   → "Exécute le pipeline complet sur l'URL de test et 
                      vérifie chaque artefact"

gen-component.md   → "Génère un composant de section pour les sites générés
                      en suivant le design system et les conventions Payload"

code-review.md     → "Fais une code review architecturale du code modifié 
                      dans cette branche. Focus sur : patterns, sécurité, 
                      performance, tests manquants"

catchup.md         → "Lis tous les fichiers modifiés dans la branche courante
                      et résume l'état actuel du travail"
```

---

## 8. Stratégie de prompts pour la génération de sites

### 8.1 Prompts d'analyse (étapes 2-5) — API Anthropic

Les étapes d'analyse utilisent l'API Anthropic directement (pas Claude Code CLI). Les prompts doivent être **structurés avec un output schema strict** :

```typescript
const analyzePrompt = {
  system: `Tu es un expert en analyse de sites web et UX design.
Tu analyses des données de scraping et produis une analyse structurée.
Tu DOIS répondre en JSON valide suivant le schéma fourni.
Ne produis RIEN d'autre que le JSON.`,

  user: (scrapingData: string) => `
Voici les données scrapées d'un site web :
${scrapingData}

Analyse le site et produis un JSON avec :
- businessType: string (secteur d'activité)
- targetAudience: string (public cible)
- toneOfVoice: "formal" | "casual" | "technical" | "friendly"
- strengths: string[] (3-5 forces du site)
- weaknesses: string[] (3-5 faiblesses)
- essentialPages: { path: string, purpose: string }[]
- secondaryPages: { path: string, purpose: string }[]
- features: { name: string, type: string, priority: "must" | "nice" }[]
- seoBaseline: { hasMetaTitles: boolean, hasMetaDescriptions: boolean, 
                  headingStructure: "good" | "poor", internalLinking: "good" | "poor" }
`
};
```

### 8.2 Prompts de génération (étape 6) — Claude Code CLI

Pour la génération de code, on utilise Claude Code CLI (`claude -p`) qui a accès au filesystem. Chaque sous-étape a un prompt dédié :

```bash
# Sous-étape : Générer un composant de section
claude -p "
Tu travailles dans le projet $(pwd)/storage/projects/${PROJECT_ID}/site/

Contexte :
- Architecture du site : $(cat artifacts/04-architecture.json | jq '.pages[0].sections')
- Design system : $(cat artifacts/05-design.json)
- Conventions : Lis templates/site-base/CLAUDE.md

Tâche :
Génère le composant Hero dans src/components/sections/Hero.tsx
- Server Component (pas de 'use client')
- Props typées depuis la collection Payload Pages (block 'hero')
- Utilise les tokens Tailwind du design system
- Responsive (mobile-first)
- Inclus les tests dans Hero.test.tsx

Vérification :
- Le composant doit compiler sans erreur TypeScript
- Les tests doivent passer
" --allowedTools "Edit,Write,Bash(npm test:*),Bash(npx tsc:*)"
```

### 8.3 Les 5 règles d'un bon prompt de génération

1. **Contexte explicite** — Toujours fournir les artefacts nécessaires (pas toute la base, juste le pertinent)
2. **Tâche unique et précise** — Un composant, un fichier, une feature par prompt
3. **Conventions par référence** — Pointer vers CLAUDE.md plutôt que répéter les rules
4. **Critères de vérification** — Toujours inclure comment Claude doit vérifier son travail (tests, build, type-check)
5. **Outils autorisés limités** — Restreindre les tools pour éviter les dérives (`--allowedTools`)

---

## 9. Patterns avancés pour SiteRebuilder

### 9.1 Git worktrees pour le travail parallèle

Le projet a des parties indépendantes qui peuvent être développées en parallèle :

```bash
# Terminal 1 : Travailler sur le pipeline engine
git worktree add ../sitebuilder-pipeline feature/pipeline-engine
cd ../sitebuilder-pipeline && claude

# Terminal 2 : Travailler sur le formulaire UI
git worktree add ../sitebuilder-ui feature/form-ui
cd ../sitebuilder-ui && claude

# Terminal 3 : Travailler sur le template de base des sites
git worktree add ../sitebuilder-template feature/site-template
cd ../sitebuilder-template && claude
```

Chaque worktree = un Claude Code isolé, pas de conflit de contexte.

### 9.2 Multi-Claude verification

Pour les parties critiques (pipeline engine, génération de code), utiliser deux sessions :

```
Session A (Claude écrit) :
  → Implémente la feature selon le plan
  → Commit

Session B (Claude review — contexte frais) :
  → "Fais une code review de la branche feature/pipeline-engine.
     Focus sur : sécurité, edge cases, patterns architecturaux.
     Ne modifie rien, note tes findings."

Session C (Claude corrige) :
  → "Lis les findings de la review et corrige les problèmes identifiés."
```

### 9.3 Le template starter comme "squelette intelligent"

Pour la Phase 4 (génération), au lieu de générer un projet from scratch à chaque fois, on prépare un **template de base** que Claude Code modifie :

```
templates/site-base/
├── CLAUDE.md                    # Conventions pour modifier ce template
├── package.json                 # Deps pré-installées
├── next.config.ts               # Config de base
├── payload.config.ts            # Structure Payload minimale
├── tailwind.config.ts           # À compléter avec les design tokens
├── src/
│   ├── app/
│   │   ├── (frontend)/layout.tsx    # Layout squelette
│   │   └── (payload)/admin/...      # Admin Payload pré-configuré
│   ├── collections/
│   │   ├── Pages.ts                 # Collection de base (à enrichir)
│   │   ├── Media.ts                 # Prêt à l'emploi
│   │   └── Navigation.ts           # Prêt à l'emploi
│   ├── components/
│   │   └── sections/
│   │       └── _SectionRenderer.tsx # Dispatcher dynamique de sections
│   └── lib/
│       └── payload.ts               # Client Payload configuré
└── Dockerfile
```

Le template est un projet **qui compile et tourne déjà**. Claude Code n'a qu'à :
1. Copier le template dans le dossier du projet
2. Modifier `tailwind.config.ts` avec les design tokens
3. Ajouter/modifier les collections Payload
4. Générer les composants de section
5. Assembler les pages
6. Seeder le contenu

C'est beaucoup plus fiable que de générer un projet from scratch, car le squelette est testé et validé manuellement.

### 9.4 Spec-driven development pour les features complexes

Pour les features majeures (inline editing, génération de code, Docker management), écrire une **spécification** avant de coder :

```markdown
# Spec : Inline Editing

## Objectif
Permettre à un admin connecté de modifier textes et images directement sur le site.

## Comportement attendu
1. Visiteur normal → Aucun bouton d'édition visible
2. Admin connecté → Overlay avec icône ✏️ sur chaque zone éditable
3. Clic sur ✏️ → Popover avec champ d'édition
4. Sauvegarde → PATCH vers API Payload → Revalidation Next.js

## Composants à créer
- EditableWrapper.tsx : HOC qui détecte le mode admin
- InlineTextEditor.tsx : Édition de texte simple
- InlineRichTextEditor.tsx : Édition richtext (Lexical)
- InlineImageEditor.tsx : Upload et remplacement d'image
- useInlineEdit.ts : Hook custom pour la logique d'édition

## API
- PATCH /api/pages/:id → Met à jour un champ spécifique
- POST /api/media → Upload une image
- POST /api/revalidate?path=/ → Revalide la page

## Critères de validation
- [ ] Les tests e2e passent (admin login → edit → save → verify)
- [ ] Aucun bouton visible pour les visiteurs (test visuel)
- [ ] Le SEO n'est pas impacté (contenu toujours SSR)
```

Cette spec est stockée dans `.claude/tasks/inline-editing/plan.md` et sert de référence à Claude Code pendant toute l'implémentation.

---

## 10. Erreurs à éviter absolument

### 10.1 Les anti-patterns identifiés par la communauté

| Anti-pattern | Pourquoi c'est un problème | Alternative |
|---|---|---|
| **"Kitchen sink session"** — Mélanger plusieurs tâches dans un contexte | Le contexte se pollue, Claude perd le fil | Une tâche par session, `/clear` entre chaque |
| **Laisser Claude coder sans plan** | Code "qui marche" mais architecture incohérente | Plan Mode obligatoire avant toute implémentation |
| **Instructions vagues** | "Ajoute le scraping" → résultat imprévisible | Spécifier fichiers, input, output, tests attendus |
| **Ignorer les erreurs de build** | Claude empile les fixes, aggrave le problème | TOUJOURS lire l'erreur avant de demander un fix |
| **Modifier les tests pour qu'ils passent** | Les tests documentent le bon comportement | L'implémentation doit s'adapter aux tests, pas l'inverse |
| **Trop de MCPs** | >20k tokens de context gaspillés | CLI tools documentés dans CLAUDE.md |
| **Multi-agent complexe** | Debugging exponentiel, LLMs fragiles | Simple control loop, une tâche à la fois |
| **Pas de hooks de qualité** | Erreurs qui s'accumulent silencieusement | Type-check et tests automatiques après chaque edit |
| **CLAUDE.md trop gros** | >2000 tokens = pollution du contexte | Progressive disclosure, pointer vers agent_docs/ |
| **Ne pas commiter régulièrement** | Pas de point de rollback | Commit après chaque sous-tâche |

### 10.2 Les patterns qui marchent (synthèse)

1. **CLAUDE.md hiérarchique** — Racine concise + sous-dossiers + agent_docs/
2. **Plan Mode systématique** — Explore → Plan → Review → Code → Verify → Commit
3. **Clear agressif** — À 60k tokens, pas à la limite
4. **TDD** — Tests d'abord, implémentation ensuite, ne jamais modifier les tests
5. **Une tâche = un contexte** — Découper, isoler, documenter la progression
6. **Template starter** — Ne pas générer from scratch, modifier un squelette validé
7. **Hooks automatiques** — Type-check et tests après chaque modification
8. **Spécifications écrites** — Pour les features complexes, spec avant code
9. **Commits fréquents** — Un commit par sous-tâche pour faciliter le rollback
10. **Code review par un second Claude** — Contexte frais = meilleure critique

---

## 11. Métriques de succès

### 11.1 Efficacité du contexte

- Coût de base CLAUDE.md : <2000 tokens (1% du contexte)
- Token budget MCP : <10k tokens
- Fréquence de /clear : toutes les 40-60k tokens
- Compactions automatiques nécessaires : 0 (on clear avant)

### 11.2 Qualité du code

- Couverture de tests : >80% sur le nouveau code
- Erreurs TypeScript avant commit : 0 (enforcé par hooks)
- Bugs en production issus du code IA : tracking pour améliorer CLAUDE.md
- Findings de code review : tracking pour ajuster les prompts

### 11.3 Productivité

- Temps plan → PR : tracker et optimiser
- Nombre d'itérations par plan : idéalement 1-3
- Tâches parallèles via worktrees : 2-3 simultanément
- Taux de succès "premier essai" par étape : >70% (sinon, améliorer le prompt/spec)

---

## 12. Application concrète — Checklist de démarrage

### Semaine 0 (avant de coder)

- [ ] Créer la structure de dossiers du projet
- [ ] Écrire le CLAUDE.md racine (150-200 lignes)
- [ ] Écrire les fichiers agent_docs/ (1 par domaine)
- [ ] Créer le template starter (site-base/) et le faire compiler manuellement
- [ ] Configurer les hooks (.claude/settings.json)
- [ ] Créer les slash commands de base
- [ ] Écrire les plans pour les 3-4 premières features (.claude/tasks/)

### Par session de développement

- [ ] Vérifier le contexte au démarrage (/context)
- [ ] Activer Plan Mode pour les nouvelles features
- [ ] Écrire les tests avant l'implémentation
- [ ] /clear à 60k tokens
- [ ] Commiter après chaque sous-tâche
- [ ] Code review avant de passer à la tâche suivante
- [ ] Mettre à jour CLAUDE.md si Claude a fait une erreur récurrente

---

## Sources

Ce document synthétise les enseignements de :
- Documentation officielle Anthropic : Claude Code Best Practices
- How Anthropic teams use Claude Code (blog Anthropic)
- Claude Code Best Practices (synthèse de 12 sources, rosmur.github.io)
- How I Use Every Claude Code Feature (Shrivu Shankar)
- Getting Good Results from Claude Code (Chris Dzombak)
- The ULTIMATE AI Coding Guide for Developers (Sabrina Ramonov)
- Claude Code is a Beast – Tips from 6 Months of Hardcore Use (Reddit)
- Writing a Good CLAUDE.md (HumanLayer Blog)
- Creating the Perfect CLAUDE.md for Claude Code (Dometrain)
- Building a Personal AI Factory (John Rush)
- 6 Weeks of Claude Code (Puzzmo Blog)
- Spec-driven development workflow (Pimzino)
