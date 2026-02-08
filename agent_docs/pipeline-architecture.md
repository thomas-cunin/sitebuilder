# Pipeline Architecture

## Vue d'ensemble

Le pipeline SiteRebuilder exécute 7 étapes séquentielles. Chaque étape produit un **artefact JSON validé par Zod** qui alimente la suivante.

```
[Formulaire] → [1. Scraping] → [2. Analyse] → [3. Inspiration] → [4. Architecture] → [5. Design] → [6. Génération] → [7. Preview]
```

## Principes fondamentaux

### 1. Artefacts intermédiaires
Chaque étape produit un fichier JSON structuré stocké dans `storage/projects/{id}/artifacts/`. Cela permet :
- Reprise à n'importe quelle étape
- Debugging facilité
- Validation/modification humaine entre les étapes

### 2. Séparation contenu / structure / style
- **Contenu** : textes, images, données
- **Structure** : pages, sections, navigation
- **Style** : couleurs, typographies, espacements

Le CMS ne gère que le contenu. La structure et le style sont figés à la génération.

### 3. Validation Zod systématique
Chaque artefact a un schéma Zod strict. Le pipeline échoue si l'artefact ne valide pas.

---

## Étape 1 — Scraping & Extraction

**Input** : URL du site source
**Output** : `01-scraping.json` + images dans MinIO

**Outils** :
- Playwright → Scraping avec rendu JavaScript
- Cheerio → Parsing HTML léger post-rendu
- @mozilla/readability → Extraction contenu principal
- sharp → Téléchargement et optimisation images
- colorthief → Extraction couleurs dominantes

**Ce qui est extrait** :
- Arborescence du site (crawl récursif, max 50 pages)
- Pour chaque page : titre, meta, headings, texte par section, images, liens, formulaires
- Screenshots (hero + tiles 1072×1072 pour Claude Vision)
- Navigation (header, footer, menus)
- Assets : logo, favicon, couleurs dominantes, fonts

**Schéma de l'artefact** : voir `apps/orchestrator/src/schemas/scraping.ts`

---

## Étape 2 — Analyse du site source

**Input** : `01-scraping.json`
**Output** : `02-analysis.json`
**Exécuteur** : API Anthropic (Sonnet) avec Vision

**Ce qui est analysé** :
- Type d'entreprise et secteur
- Public cible
- Tone of voice (formel, casual, technique, friendly)
- Forces et faiblesses (3-5 chaque, incluant aspects visuels)
- Pages essentielles vs secondaires
- Features détectées (formulaires, e-commerce, blog)
- Baseline SEO

**Particularité** : L'analyse combine données structurées (artefact 01) + screenshots (tiles 1072×1072) pour une évaluation visuelle.

---

## Étape 3 — Analyse des inspirations

**Input** : URLs d'inspiration + `02-analysis.json`
**Output** : `03-inspiration.json`
**Exécuteur** : Playwright (scraping) + API Anthropic (analyse)

**Ce qui est extrait et analysé** :
- Design patterns par site (hero, cards, grilles)
- Palette de couleurs et typographies
- Structure des pages
- Éléments différenciants
- Synthèse croisée avec le secteur du site source

**Budget images** : max 3-4 screenshots par site d'inspiration.

---

## Étape 4 — Architecture & Structure

**Input** : `02-analysis.json` + `03-inspiration.json`
**Output** : `04-architecture.json`
**Exécuteur** : API Anthropic (Sonnet)

**Ce qui est produit** :
- Arborescence du nouveau site (pages, slugs, hiérarchie)
- Pour chaque page : sections ordonnées avec type
- Plan de contenu (textes à réécrire vs conserver)
- Mapping des formulaires
- Content slots → Blocks Payload

---

## Étape 5 — Design System

**Input** : `03-inspiration.json` + `04-architecture.json`
**Output** : `05-design.json`
**Exécuteur** : API Anthropic (Sonnet)

**Ce qui est produit** :
- Palette (primary, secondary, accent, neutral, success, warning, error)
- Typographies (headings font, body font, mono font + fallbacks)
- Spacing scale (base unit, scale)
- Border radius, shadows
- Tokens Tailwind prêts à injecter
- Direction artistique en texte

---

## Étape 6 — Génération du site

**Input** : Tous les artefacts précédents
**Output** : Projet Next.js + Payload dans `storage/projects/{id}/site/`
**Exécuteur** : Claude Code CLI

**Sous-étapes** (chacune = un appel Claude Code) :
1. Copier template + appliquer design tokens
2. Générer/modifier collections Payload
3. Générer composants de section (un par un)
4. Assembler les pages
5. Rédiger textes + seeder base Payload
6. Configurer formulaires (Form Builder)
7. Finitions (nav, footer, SEO, favicon)

---

## Étape 7 — Preview live

**Input** : Projet généré
**Output** : URL de preview `{projectId}.preview.localhost`

**Mécanisme** :
- Création conteneur Docker via dockerode
- Code source monté en volume
- Routing Traefik automatique
- Interface de feedback dans l'orchestrateur

---

## BullMQ Job Queue

Chaque étape du pipeline est un job BullMQ :
- Queue : `pipeline`
- Job data : `{ projectId, step }`
- Retry : 3 tentatives avec backoff exponentiel
- Timeout : configurable par étape

**États des steps** :
- `pending` → En attente
- `running` → En cours
- `done` → Terminé avec succès
- `error` → Échec après retries
- `skipped` → Sauté (reprise partielle)

---

## Gestion d'erreurs

1. **Échec API Anthropic** → Retry 3x avec backoff
2. **Échec scraping** → Log + passage à "error"
3. **Artefact invalide** → Validation Zod échoue → step "error"
4. **Timeout** → Step "error" + notification

Chaque erreur est loggée dans `pipeline_logs` avec niveau, message, et données contextuelles.

---

## Reprise du pipeline

Le pipeline peut être repris à n'importe quelle étape :
1. L'utilisateur modifie un artefact manuellement
2. Il clique "Relancer depuis l'étape X"
3. Les étapes X à 7 sont ré-exécutées
4. Les artefacts précédents sont conservés
