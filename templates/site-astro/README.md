# Template Web - Site Vitrine Statique

Template Astro pour créer rapidement des sites vitrines clients à partir de fichiers JSON.

## Principe

```
data/*.json  →  Astro  →  Site HTML statique
```

Tout le contenu est défini dans des fichiers JSON, pas de CMS, pas de base de données.

## Démarrage rapide

### Génération automatique

```bash
# Génération standard (rapide)
npm run generate "https://site-client.fr" "nom-client"

# Génération CRÉATIVE (agents IA spécialisés)
npm run generate:creative "https://site-client.fr" "nom-client"
```

Le site est généré dans `clients/nom-client/`.

### Mode Standard vs Créatif

| Mode | Commande | Description |
|------|----------|-------------|
| **Standard** | `npm run generate` | Utilise les templates existants, rapide |
| **Créatif** | `npm run generate:creative` | Chaque section générée par un agent IA unique |

### Validation Visuelle Automatique

Après la génération, une **validation visuelle automatique** est effectuée :

1. **Validation** : Capture screenshots + analyse IA des problèmes
2. **Correction** : Si problèmes critiques/majeurs → correction auto
3. **Rebuild** : Recompilation après corrections
4. **Revalidation** : Score final (sans re-correction, évite boucle infinie)

```bash
# Génération standard (avec validation + correction auto)
npm run generate:creative "https://site.fr" "client"

# Sans correction automatique
npm run generate:creative "https://site.fr" "client" --no-fix

# Ignorer la validation (plus rapide)
npm run generate:creative "https://site.fr" "client" --skip-validation

# Valider un site existant
npm run validate clients/mon-client
npm run validate clients/mon-client --fix
```

### Génération créative (recommandé pour sites uniques)

Le mode créatif utilise **des agents IA spécialisés** pour chaque section:

1. **Agent Design**: Analyse le site source, définit la direction artistique
2. **Agent Hero**: Génère un Hero créatif (6 variantes possibles)
3. **Agent Services**: Génère la grille de services (7 variantes)
4. **Agent Testimonials**: Génère les témoignages (5 variantes)
5. **Agent Pricing**: Génère les tarifs (6 variantes)
6. **Agent FAQ**: Génère l'accordéon FAQ (6 variantes)

Chaque agent a la **liberté créative** dans des contraintes définies:
- Styles: minimal, modern, bold, glassmorphism, brutalist, elegant, playful, dark-tech
- Animations CSS custom
- Layouts uniques
- Effets visuels originaux

### Configuration manuelle

```bash
# 1. Configurer un nouveau client
npm run new-site

# 2. Développement
npm run dev

# 3. Build production
npm run build

# 4. Preview
npm run preview
```

## Structure des fichiers JSON

```
data/
├── site.json        # Infos générales (nom, contact, réseaux, analytics)
├── navigation.json  # Liens header et footer
├── pages.json       # Structure des pages
├── content.json     # Tout le contenu textuel (FR/EN)
└── media.json       # Images et logos
```

### site.json
```json
{
  "name": "Mon Entreprise",
  "url": "https://example.com",
  "defaultLang": "fr",
  "langs": ["fr", "en"],
  "contact": { "email": "...", "phone": "...", "address": {...} },
  "social": { "facebook": "...", "instagram": "...", "linkedin": "..." },
  "analytics": { "plausible": "", "googleAnalytics": "" },
  "theme": { "primaryColor": "#0ea5e9", "secondaryColor": "#d946ef" }
}
```

### content.json
Contient tout le contenu textuel avec traductions :
- `hero` : titre, sous-titre, CTAs
- `services.items[]` : liste des services
- `testimonials.items[]` : témoignages clients
- `pricing.items[]` : plans tarifaires
- `faq.items[]` : questions fréquentes
- `cta` : section call-to-action
- `contact` : formulaire de contact
- `footer` : texte du footer
- `nav` : labels de navigation

### media.json
```json
{
  "logo": { "default": "/images/logo.svg" },
  "hero": { "image": "/images/hero.jpg" },
  "trust": [{ "name": "Client 1", "logo": "" }]
}
```

## Personnalisation des couleurs

Les couleurs sont **automatiquement générées** depuis `data/site.json`:

```json
{
  "theme": {
    "primaryColor": "#3b82f6",
    "secondaryColor": "#8b5cf6"
  }
}
```

Le `tailwind.config.mjs` lit ces couleurs et génère automatiquement toute la palette (50-950).

### Analyse design automatique

Lors de la génération depuis une URL, Claude analyse les screenshots pour extraire:
- Couleurs primaire/secondaire
- Style (modern, classic, minimal, bold, elegant)
- Paramètres UI (border-radius, shadows, spacing)

```bash
# Analyser le design d'un site seul
npm run analyze-design "https://example.com" ./output-dir
```

## Validation visuelle automatique

Après chaque génération, Claude analyse le site pour détecter les problèmes :

| Catégorie | Vérifications |
|-----------|---------------|
| **Texte** | Tronqué, débordement, contraste, superposition |
| **Layout** | Chevauchements, espacements, alignements |
| **Images** | Manquantes, déformées, placeholders |
| **Responsive** | Éléments trop larges/petits sur mobile |
| **Cohérence** | Couleurs, typographie, espacements |

**Scores :**
- 90-100 = Excellent
- 70-89 = Bon
- 50-69 = Passable
- <50 = Problématique

Le rapport est sauvegardé dans `clients/<nom>/validation-report.json`.

## Composants disponibles

| Composant | Description |
|-----------|-------------|
| Hero | Section principale avec titre, CTA et image |
| Services | Grille de 4 services avec icônes |
| Testimonials | 3 témoignages clients |
| Pricing | 3 plans tarifaires |
| FAQ | Accordéon de questions/réponses |
| CTA | Bannière call-to-action |
| ContactForm | Formulaire de contact (Formspree) |

## Multi-langue

Le site supporte FR et EN par défaut. Pour chaque texte :

```json
{
  "title": { "fr": "Titre français", "en": "English title" }
}
```

Pages :
- `/` → Français
- `/en` → Anglais

## Formulaire de contact

Le formulaire utilise [Formspree](https://formspree.io) (gratuit).

1. Créer un formulaire sur formspree.io
2. Remplacer `YOUR_FORM_ID` dans `ContactForm.astro`

## Déploiement

### Build statique
```bash
npm run build
# Fichiers dans dist/
```

### Docker
```bash
docker build -t mon-site .
docker run -p 80:80 mon-site
```

## Checklist nouveau client

- [ ] `npm run new-site` pour configurer les infos de base
- [ ] Modifier `data/content.json` avec le contenu client
- [ ] Ajouter le logo dans `public/images/logo.svg`
- [ ] Ajouter l'image hero dans `public/images/hero.jpg`
- [ ] Configurer Formspree pour le formulaire
- [ ] `npm run build` et déployer

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build statique |
| `npm run preview` | Preview du build |
| `npm run new-site` | Assistant nouveau client |
| `npm run generate` | Génération standard (templates) |
| `npm run generate:creative` | Génération créative (avec validation + correction auto) |
| `npm run generate:creative ... --no-fix` | Sans correction automatique |
| `npm run generate:creative ... --skip-validation` | Sans validation visuelle |
| `npm run analyze-design` | Analyser le design d'un site |
| `npm run validate <dir>` | Valider visuellement un site généré |
| `npm run validate <dir> --fix` | Valider et corriger automatiquement |

## Licence

MIT
