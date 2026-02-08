# Intégration Claude Code CLI

## Pourquoi Claude Code CLI ?

Claude Code CLI est l'outil officiel d'Anthropic pour interagir avec Claude dans un contexte de développement. Il permet de :

- **Générer du code** directement dans les fichiers
- **Modifier des fichiers existants** de manière intelligente
- **Analyser des projets** et comprendre le contexte
- **Exécuter des commandes** de validation

## Installation

### Sur le serveur de production

```bash
# Via npm (recommandé)
npm install -g @anthropic-ai/claude-code

# Vérifier l'installation
claude --version
```

### Configuration

```bash
# Option 1 : Login interactif
claude auth login

# Option 2 : Variable d'environnement (production)
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### Fichier de configuration

Créer `~/.claude/config.json` :

```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "temperature": 0.7
}
```

## Utilisation dans Sitebuilder

### Workflow de génération

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSUS DE GÉNÉRATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PRÉPARATION                                              │
│     ├── Copier template vers /storage/clients/{name}         │
│     ├── Écrire client-info.json                              │
│     └── Initialiser le projet                                │
│                                                              │
│  2. ANALYSE (si URL source)                                  │
│     ├── claude "Analyse {url} et extrais..."                 │
│     └── Sauvegarde dans data/site.json                       │
│                                                              │
│  3. GÉNÉRATION CONTENU                                       │
│     ├── claude "Génère les textes marketing..."              │
│     ├── claude "Crée les sections FAQ, services..."          │
│     └── Sauvegarde dans data/content.json                    │
│                                                              │
│  4. PERSONNALISATION DESIGN                                  │
│     ├── claude "Adapte les couleurs et styles..."            │
│     └── Modifie src/styles/global.css                        │
│                                                              │
│  5. VALIDATION                                               │
│     ├── npm run build                                        │
│     ├── claude "Vérifie et corrige les erreurs..."           │
│     └── Génère le rapport de validation                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Commandes Claude Code

#### Analyse de site

```bash
claude --cwd /app/storage/clients/mon-client \
  --print \
  "Analyse le site https://exemple.com et crée un fichier data/site.json
   contenant :
   - Nom de l'entreprise
   - Description de l'activité
   - Services proposés
   - Palette de couleurs (hex)
   - Style général (moderne, classique, etc.)
   - Informations de contact trouvées"
```

#### Génération de contenu

```bash
claude --cwd /app/storage/clients/mon-client \
  "En utilisant les informations de data/site.json et client-info.json,
   génère le contenu complet du site dans data/content.json.

   Le fichier doit contenir :
   - hero: titre accrocheur, sous-titre, CTA
   - services: liste des services avec descriptions
   - about: texte de présentation
   - testimonials: 3 témoignages crédibles
   - faq: 5-8 questions fréquentes
   - contact: texte d'invitation au contact

   Ton : professionnel mais accessible
   Langue : français
   Style : engageant, orienté conversion"
```

#### Modification de composants

```bash
claude --cwd /app/storage/clients/mon-client \
  "Modifie src/components/Hero.astro pour :
   1. Utiliser le titre de data/content.json
   2. Ajouter une image de fond (utilise placeholder)
   3. Animer le bouton CTA au hover
   4. Rendre responsive pour mobile"
```

#### Personnalisation du design

```bash
claude --cwd /app/storage/clients/mon-client \
  "Modifie src/styles/global.css pour :
   1. Utiliser les couleurs de data/site.json
   2. Définir les variables CSS :root
   3. Appliquer la couleur primaire aux boutons
   4. Appliquer la couleur secondaire aux accents"
```

#### Validation et correction

```bash
claude --cwd /app/storage/clients/mon-client \
  "Exécute 'npm run build' et analyse les erreurs.
   Pour chaque erreur :
   1. Identifie la cause
   2. Corrige le fichier concerné
   3. Vérifie que la correction fonctionne

   Continue jusqu'à ce que le build passe."
```

## Script de génération complet

### generate-with-claude.js

```javascript
#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs/promises');

const CLIENTS_DIR = process.env.CLIENTS_DIR || '/app/storage/clients';
const TEMPLATE_DIR = process.env.SITE_ASTRO_DIR || '/app/templates/site-astro';

async function runClaude(cwd, prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--cwd', cwd, '--print', prompt], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    proc.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Claude exited with code ${code}`));
    });
  });
}

async function generateSite(clientName, sourceUrl, clientInfo) {
  const clientDir = path.join(CLIENTS_DIR, clientName);

  console.log('[10%] Préparation du répertoire...');
  await fs.cp(path.join(TEMPLATE_DIR, 'template'), clientDir, { recursive: true });

  console.log('[15%] Écriture des informations client...');
  await fs.writeFile(
    path.join(clientDir, 'client-info.json'),
    JSON.stringify({ name: clientName, sourceUrl, ...clientInfo }, null, 2)
  );

  if (sourceUrl) {
    console.log('[25%] Analyse du site source...');
    await runClaude(clientDir, `
      Analyse le site ${sourceUrl} et crée data/site.json avec :
      - businessName: nom de l'entreprise
      - activity: description courte
      - services: liste des services
      - colors: { primary, secondary, accent }
      - style: moderne/classique/minimaliste
      - contact: infos trouvées
    `);
  }

  console.log('[40%] Génération du contenu...');
  await runClaude(clientDir, `
    En utilisant data/site.json et client-info.json, crée data/content.json avec :
    - hero: { title, subtitle, cta }
    - services: [{ title, description, icon }]
    - about: { title, text, image }
    - testimonials: [{ author, role, text, rating }]
    - faq: [{ question, answer }]
    - contact: { title, text }

    Contenu en français, professionnel et engageant.
  `);

  console.log('[60%] Personnalisation du design...');
  await runClaude(clientDir, `
    Modifie src/styles/global.css avec les couleurs de data/site.json.
    Crée les variables CSS :root appropriées.
  `);

  console.log('[80%] Build et validation...');
  await runClaude(clientDir, `
    Exécute ces commandes :
    1. npm install
    2. npm run build

    Si des erreurs, corrige-les et relance le build.
  `);

  console.log('[100%] Génération terminée!');
  return clientDir;
}

// CLI
const [,, clientName, sourceUrl] = process.argv;
if (!clientName) {
  console.error('Usage: generate-with-claude.js <client-name> [source-url]');
  process.exit(1);
}

generateSite(clientName, sourceUrl, {})
  .then((dir) => console.log(`Site généré dans: ${dir}`))
  .catch((err) => {
    console.error('Erreur:', err.message);
    process.exit(1);
  });
```

## Prompts optimisés

### CLAUDE.md du template

Créer `templates/site-astro/CLAUDE.md` :

```markdown
# Sitebuilder - Instructions Claude Code

## Contexte
Tu es un assistant spécialisé dans la génération de sites vitrines professionnels.
Ce projet utilise Astro avec Tailwind CSS.

## Structure du projet
```
├── src/
│   ├── components/     # Composants Astro réutilisables
│   ├── layouts/        # Layout principal
│   ├── pages/          # Pages du site
│   └── styles/         # CSS global
├── data/
│   ├── site.json       # Configuration générale
│   ├── content.json    # Contenu des sections
│   └── navigation.json # Menu de navigation
├── public/             # Assets statiques
└── client-info.json    # Infos fournies par le client
```

## Règles de génération

### Contenu
- Langue : français par défaut
- Ton : professionnel mais accessible
- Longueur : textes concis mais complets
- SEO : inclure mots-clés pertinents

### Design
- Utiliser les variables CSS de :root
- Mobile-first responsive
- Accessibilité WCAG 2.1 AA
- Performance optimisée

### Code
- TypeScript strict
- Composants atomiques
- Props typées
- Pas de code mort

## Fichiers à ne PAS modifier
- astro.config.mjs
- tailwind.config.mjs
- tsconfig.json
- package.json (sauf dépendances)

## Commandes disponibles
- `npm run dev` : Serveur de développement
- `npm run build` : Build production
- `npm run preview` : Preview du build
```

### Prompts par section

#### Hero

```
Génère le contenu hero dans data/content.json.hero :
{
  "title": "Titre accrocheur de 5-8 mots",
  "subtitle": "Sous-titre explicatif de 15-20 mots",
  "cta": {
    "text": "Texte du bouton (2-4 mots)",
    "link": "#contact"
  },
  "image": "URL placeholder ou description"
}

Basé sur: {activité du client}
Objectif: Capter l'attention, expliquer la valeur, inciter à l'action
```

#### Services

```
Génère 3-6 services dans data/content.json.services :
[{
  "title": "Nom du service",
  "description": "Description en 2-3 phrases",
  "icon": "nom-icone-lucide",
  "features": ["point 1", "point 2", "point 3"]
}]

Basé sur: {services du client}
Style: Axé bénéfices client, pas juste fonctionnalités
```

#### Testimonials

```
Génère 3 témoignages crédibles dans data/content.json.testimonials :
[{
  "author": "Prénom Nom",
  "role": "Fonction, Entreprise",
  "text": "Témoignage de 2-3 phrases authentique",
  "rating": 5,
  "avatar": "initiales ou placeholder"
}]

Style: Varié, spécifique, mentionnant des résultats concrets
```

## Gestion des erreurs

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Cannot find module` | Dépendance manquante | `npm install` |
| `Type error` | TypeScript strict | Ajouter les types |
| `Build failed` | Syntaxe invalide | Vérifier le fichier |

### Retry automatique

```bash
# Le script réessaie 3 fois en cas d'erreur
claude --cwd $DIR --max-retries 3 "Corrige les erreurs du build"
```

## Coûts et optimisation

### Tokens par génération

| Étape | Tokens estimés |
|-------|----------------|
| Analyse site | ~2,000 |
| Contenu | ~4,000 |
| Design | ~1,500 |
| Validation | ~1,000 |
| **Total** | **~8,500** |

### Optimisations

1. **Cache des analyses** : Réutiliser site.json si même source
2. **Templates pré-remplis** : Moins de génération nécessaire
3. **Batch requests** : Grouper les modifications
4. **Modèle adapté** : Haiku pour validation, Sonnet pour création

## Debugging

### Mode verbose

```bash
claude --cwd $DIR --verbose "Ta commande"
```

### Logs détaillés

```bash
# Sauvegarder les échanges
claude --cwd $DIR --log-file ./generation.log "Ta commande"
```

### Test manuel

```bash
# Tester une commande isolément
cd /app/storage/clients/test-client
claude "Liste les fichiers et leur contenu"
```
