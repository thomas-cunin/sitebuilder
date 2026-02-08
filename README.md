# Sitebuilder

Plateforme de génération automatique de sites vitrines par IA avec déploiement sur Dokploy.

## Architecture

```
sitebuilder/
├── apps/
│   └── dashboard/              # Dashboard de gestion (Next.js 15)
├── templates/
│   ├── site-astro/             # Template Astro + scripts IA
│   ├── site-base/              # Template PayloadCMS
│   └── site-vanilla/           # Template HTML/CSS
├── storage/
│   ├── clients/                # Sites générés
│   └── projects/               # Projets Dokploy
├── docker/                     # Dockerfiles utilitaires
└── agent_docs/                 # Documentation technique
```

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Dashboard | Next.js 15, shadcn/ui, Tailwind CSS |
| Base de données | PostgreSQL + Prisma |
| Authentification | Cookie session (bcrypt) |
| Génération IA | Claude API (Anthropic) |
| Templates | Astro, PayloadCMS, HTML/CSS |
| Déploiement | Dokploy |
| Conteneurisation | Docker |

## Prérequis

- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (optionnel)
- Compte Anthropic (clé API Claude)
- Instance Dokploy (pour le déploiement)

## Installation

### 1. Cloner le repo

```bash
git clone https://github.com/thomas-cunin/sitebuilder.git
cd sitebuilder
```

### 2. Configuration du Dashboard

```bash
cd apps/dashboard

# Installer les dépendances
npm install

# Copier la config
cp .env.example .env
```

Éditer `.env` :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/sitebuilder"

# Mot de passe admin (hashé au premier lancement)
ADMIN_PASSWORD="votre-mot-de-passe"

# Chemins (relatifs à apps/dashboard)
ROOT_DIR="../.."
SITE_ASTRO_DIR="../../templates/site-astro"
CLIENTS_DIR="../../storage/clients"

# Dokploy
DOKPLOY_URL="https://votre-instance-dokploy.com"
DOKPLOY_TOKEN="votre-token-dokploy"

# Claude API
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Initialiser la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables
npx prisma db push
```

### 4. Lancer le Dashboard

```bash
# Mode développement
npm run dev

# Ou avec Docker
docker-compose up -d
```

Le dashboard est accessible sur http://localhost:3000

## Utilisation avec Docker

### Démarrage complet

```bash
cd apps/dashboard
docker-compose up -d
```

Cela lance :
- **dashboard** : Application Next.js (port 3000)
- **db** : PostgreSQL (port 5432)

### Variables d'environnement Docker

Créer un fichier `.env` à la racine de `apps/dashboard` :

```env
DOKPLOY_URL=https://votre-dokploy.com
DOKPLOY_TOKEN=votre-token
ANTHROPIC_API_KEY=sk-ant-...
```

## Workflow de Génération

```
1. Création du site (formulaire)
   └── POST /api/sites → Status: DRAFT

2. Génération IA
   └── POST /api/sites/:id/generate
       ├── Copie du template site-astro
       ├── Écriture client-info.json
       ├── Exécution creative-generate.js
       └── Status: GENERATED

3. Déploiement Dokploy
   └── POST /api/sites/:id/deploy
       ├── Création projet Dokploy
       ├── Création app (Dockerfile)
       ├── Build & Deploy
       └── Status: DEPLOYED
```

## Structure du Dashboard

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── login/page.tsx        # Connexion
│   │   ├── sites/
│   │   │   ├── page.tsx          # Liste des sites
│   │   │   ├── new/page.tsx      # Formulaire création
│   │   │   └── [id]/page.tsx     # Détails + logs
│   │   ├── settings/page.tsx     # Configuration
│   │   └── api/                  # Routes API
│   ├── components/
│   │   ├── ui/                   # Composants shadcn
│   │   ├── Layout.tsx            # Sidebar navigation
│   │   ├── SiteForm.tsx          # Formulaire multi-étapes
│   │   ├── LogViewer.tsx         # Logs temps réel (SSE)
│   │   └── JobProgress.tsx       # Progression tâches
│   └── lib/
│       ├── db.ts                 # Client Prisma
│       ├── auth.ts               # Authentification
│       ├── generation.ts         # Wrapper scripts IA
│       └── dokploy.ts            # Client Dokploy
├── prisma/
│   └── schema.prisma             # Schéma BDD
└── Dockerfile
```

## Schéma Base de Données

```prisma
model Site {
  id              String      @id
  name            String      @unique  // Slug
  displayName     String
  sourceUrl       String?
  clientInfo      Json
  status          SiteStatus  // DRAFT → GENERATING → GENERATED → DEPLOYING → DEPLOYED
  dokployProjectId String?
  deployedUrl     String?
  validationScore Int?
  jobs            Job[]
  logs            Log[]
}

model Job {
  id        String  // GENERATE | DEPLOY
  type      String
  status    String  // PENDING | RUNNING | COMPLETED | FAILED
  progress  Int
  error     String?
}

model Log {
  level   String  // INFO | WARN | ERROR
  message String
}

model Settings {
  adminPassword String
  dokployUrl    String?
  dokployToken  String?
  claudeApiKey  String?
}
```

## Scripts de Génération

Les scripts sont dans `templates/site-astro/scripts/` :

| Script | Description |
|--------|-------------|
| `creative-generate.js` | Génération créative avec Claude |
| `generate-site.js` | Génération standard |
| `analyze-design.js` | Analyse d'un site existant |
| `validate-site.js` | Validation du site généré |
| `new-site.js` | Création manuelle d'un site |

### Exécution manuelle

```bash
cd templates/site-astro

# Créer un nouveau site
node scripts/new-site.js mon-client

# Générer le contenu
cd ../storage/clients/mon-client
node ../../templates/site-astro/scripts/creative-generate.js
```

## Déploiement sur Dokploy

### Configuration Dokploy

1. Créer un token API dans Dokploy
2. Configurer dans Settings du dashboard
3. Ou via variables d'environnement

### Déploiement manuel (CLI)

```bash
# Installer le CLI Dokploy
npm install -g dokploy-cli

# Configurer
export DOKPLOY_URL=https://votre-dokploy.com
export DOKPLOY_TOKEN=votre-token

# Créer projet
dokploy project create --name "site-mon-client"

# Créer app
dokploy app create \
  --project "site-mon-client" \
  --name web \
  --type dockerfile \
  --path ./storage/clients/mon-client

# Déployer
dokploy deploy --app <app-id>
```

## API Endpoints

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth` | Connexion |
| DELETE | `/api/auth` | Déconnexion |
| POST | `/api/auth/logout` | Déconnexion (redirect) |

### Sites

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sites` | Liste des sites |
| POST | `/api/sites` | Créer un site |
| GET | `/api/sites/:id` | Détails d'un site |
| PUT | `/api/sites/:id` | Modifier un site |
| DELETE | `/api/sites/:id` | Supprimer un site |
| POST | `/api/sites/:id/generate` | Lancer la génération |
| POST | `/api/sites/:id/deploy` | Lancer le déploiement |
| GET | `/api/sites/:id/logs` | Logs (JSON ou SSE) |

### Settings

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/settings` | Configuration actuelle |
| PUT | `/api/settings` | Modifier la configuration |

## Développement

### Lancer en local

```bash
# Dashboard
cd apps/dashboard
npm run dev

# Template Astro (pour tests)
cd templates/site-astro
npm install
npm run dev
```

### Build production

```bash
cd apps/dashboard
npm run build
npm start
```

### Prisma Studio

```bash
cd apps/dashboard
npx prisma studio
```

## Contribution

1. Fork le repo
2. Créer une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m 'feat: Ma feature'`)
4. Push (`git push origin feature/ma-feature`)
5. Créer une Pull Request

## License

MIT
