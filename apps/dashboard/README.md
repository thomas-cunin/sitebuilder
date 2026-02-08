# Dashboard Sitebuilder

Dashboard Next.js pour la gestion et génération de sites vitrines.

## Stack

- **Framework** : Next.js 15 (App Router)
- **UI** : shadcn/ui + Tailwind CSS
- **Base de données** : PostgreSQL + Prisma
- **Auth** : Cookie session (bcrypt)
- **Temps réel** : Server-Sent Events (SSE)

## Installation rapide

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Initialiser la BDD
npx prisma generate
npx prisma db push

# Lancer
npm run dev
```

## Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `ADMIN_PASSWORD` | Mot de passe initial | `admin123` |
| `ROOT_DIR` | Racine du projet | `../..` |
| `SITE_ASTRO_DIR` | Chemin template Astro | `../../templates/site-astro` |
| `CLIENTS_DIR` | Chemin sites générés | `../../storage/clients` |
| `DOKPLOY_URL` | URL instance Dokploy | `https://dokploy.example.com` |
| `DOKPLOY_TOKEN` | Token API Dokploy | `dk_...` |
| `ANTHROPIC_API_KEY` | Clé API Claude | `sk-ant-...` |

## Scripts

```bash
npm run dev        # Développement
npm run build      # Build production
npm run start      # Lancer en production
npm run lint       # Linter
npm run db:generate # Générer client Prisma
npm run db:push    # Appliquer le schéma
npm run db:studio  # Ouvrir Prisma Studio
```

## Docker

```bash
# Lancer dashboard + PostgreSQL
docker-compose up -d

# Logs
docker-compose logs -f dashboard

# Arrêter
docker-compose down
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard principal (stats + sites récents) |
| `/login` | Page de connexion |
| `/sites` | Liste des sites avec filtres |
| `/sites/new` | Formulaire de création |
| `/sites/[id]` | Détails, logs, actions |
| `/settings` | Configuration Dokploy/Claude |

## Formulaire de création

Le formulaire collecte :

**Informations de base**
- Nom du client (génère le slug)
- URL source (site à analyser)
- Description de l'activité

**Contact**
- Email, téléphone, adresse

**Réseaux sociaux**
- Facebook, Instagram, LinkedIn

**Options**
- Couleurs primaire/secondaire
- Mode de génération (créatif/standard)

## Statuts des sites

| Status | Description |
|--------|-------------|
| `DRAFT` | Site créé, pas encore généré |
| `GENERATING` | Génération IA en cours |
| `GENERATED` | Prêt à déployer |
| `DEPLOYING` | Déploiement Dokploy en cours |
| `DEPLOYED` | En ligne |
| `ERROR` | Erreur de génération/déploiement |

## Architecture des fichiers

```
src/
├── app/
│   ├── layout.tsx          # Layout racine
│   ├── page.tsx            # Dashboard
│   ├── login/page.tsx      # Connexion
│   ├── sites/
│   │   ├── page.tsx        # Liste
│   │   ├── new/page.tsx    # Création
│   │   └── [id]/page.tsx   # Détails
│   ├── settings/page.tsx   # Config
│   └── api/
│       ├── auth/           # Login/logout
│       ├── sites/          # CRUD + actions
│       └── settings/       # Config
├── components/
│   ├── ui/                 # shadcn components
│   ├── Layout.tsx          # Sidebar + navigation
│   ├── SiteCard.tsx        # Carte site
│   ├── SiteForm.tsx        # Formulaire création
│   ├── SiteList.tsx        # Liste avec actions
│   ├── LogViewer.tsx       # Logs SSE
│   └── JobProgress.tsx     # Progression
├── lib/
│   ├── db.ts               # Client Prisma
│   ├── auth.ts             # Helpers auth
│   ├── generation.ts       # Wrapper scripts
│   ├── dokploy.ts          # Client Dokploy
│   └── utils.ts            # Helpers
├── middleware.ts           # Protection routes
└── types/index.ts          # Types TypeScript
```

## Logs temps réel

Le composant `LogViewer` utilise Server-Sent Events pour afficher les logs en temps réel pendant la génération/déploiement.

```typescript
// Endpoint SSE
GET /api/sites/:id/logs?stream=true

// Réponse
data: [{"id":"...","level":"INFO","message":"...","createdAt":"..."}]
```

## Sécurité

- Authentification par mot de passe hashé (bcrypt)
- Session cookie HTTP-only
- Middleware de protection des routes
- Tokens Dokploy/Claude stockés en BDD (non exposés côté client)
