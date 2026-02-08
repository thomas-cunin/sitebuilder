# Architecture Production

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              DOKPLOY SERVER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────────────────────────────────────┐  │
│  │   Dashboard  │     │           Site Generator Service              │  │
│  │   (Next.js)  │────▶│  ┌─────────────────────────────────────────┐ │  │
│  │              │     │  │           Claude Code CLI               │ │  │
│  │  - UI Admin  │     │  │                                         │ │  │
│  │  - API REST  │     │  │  - Analyse site source                  │ │  │
│  │  - Jobs queue│     │  │  - Génération contenu IA                │ │  │
│  └──────┬───────┘     │  │  - Création composants                  │ │  │
│         │             │  │  - Validation automatique               │ │  │
│         │             │  └─────────────────────────────────────────┘ │  │
│         │             └──────────────────────────────────────────────┘  │
│         │                              │                                 │
│         ▼                              ▼                                 │
│  ┌──────────────┐           ┌──────────────────┐                        │
│  │  PostgreSQL  │           │  Storage Volume  │                        │
│  │              │           │                  │                        │
│  │  - Sites     │           │  - /clients      │                        │
│  │  - Jobs      │           │  - /templates    │                        │
│  │  - Logs      │           │                  │                        │
│  └──────────────┘           └────────┬─────────┘                        │
│                                      │                                   │
│                                      ▼                                   │
│                           ┌──────────────────┐                          │
│                           │   Dokploy API    │                          │
│                           │                  │                          │
│                           │  - Create app    │                          │
│                           │  - Deploy        │                          │
│                           │  - Manage domain │                          │
│                           └────────┬─────────┘                          │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │        Sites Déployés           │
                    │                                 │
                    │  site-client1.mondomaine.com   │
                    │  site-client2.mondomaine.com   │
                    │  ...                            │
                    └─────────────────────────────────┘
```

## Composants

### 1. Dashboard (apps/dashboard)

Application Next.js qui sert d'interface d'administration :

- **Interface utilisateur** : Création de sites, suivi des jobs, logs
- **API REST** : Endpoints pour le CRUD et les actions
- **Job Queue** : Gestion des tâches de génération/déploiement
- **Base de données** : PostgreSQL via Prisma

### 2. Site Generator Service

Service qui exécute Claude Code CLI pour la génération :

- **Claude Code CLI** : Outil IA pour générer le code des sites
- **Scripts** : Orchestration de la génération
- **Templates** : Base Astro à personnaliser
- **Validation** : Vérification automatique du résultat

### 3. Storage

Volume partagé pour les fichiers :

- `/templates` : Templates de base (site-astro, etc.)
- `/clients` : Sites générés pour chaque client
- `/logs` : Logs de génération détaillés

### 4. Dokploy

Plateforme de déploiement :

- Création automatique de projets/apps
- Build Docker des sites
- Gestion des domaines/SSL
- Monitoring

## Workflow de Production

### Étape 1 : Création du site

```
Utilisateur                    Dashboard                     Database
    │                              │                             │
    │  Formulaire client info      │                             │
    │─────────────────────────────▶│                             │
    │                              │  INSERT site (DRAFT)        │
    │                              │────────────────────────────▶│
    │                              │                             │
    │  Confirmation + ID           │                             │
    │◀─────────────────────────────│                             │
```

### Étape 2 : Génération IA

```
Dashboard                Site Generator              Claude Code CLI
    │                         │                            │
    │  POST /generate         │                            │
    │────────────────────────▶│                            │
    │                         │                            │
    │  Job ID                 │  1. Copier template        │
    │◀────────────────────────│─────────────────────────▶  │
    │                         │                            │
    │                         │  2. Écrire client-info     │
    │                         │─────────────────────────▶  │
    │                         │                            │
    │  Progress updates (SSE) │  3. claude "Génère le     │
    │◀────────────────────────│     contenu pour..."      │
    │                         │─────────────────────────▶  │
    │                         │                            │
    │                         │  4. Modifier fichiers      │
    │                         │◀─────────────────────────  │
    │                         │                            │
    │                         │  5. Valider le résultat    │
    │                         │─────────────────────────▶  │
    │                         │                            │
    │  Status: GENERATED      │                            │
    │◀────────────────────────│                            │
```

### Étape 3 : Déploiement

```
Dashboard                    Dokploy API                  Sites
    │                            │                           │
    │  POST /deploy              │                           │
    │───────────────────────────▶│                           │
    │                            │                           │
    │                            │  Create project           │
    │                            │──────────────────────────▶│
    │                            │                           │
    │                            │  Create app (Dockerfile)  │
    │                            │──────────────────────────▶│
    │                            │                           │
    │                            │  Build & Deploy           │
    │                            │──────────────────────────▶│
    │                            │                           │
    │  URL: https://site.com     │                           │
    │◀───────────────────────────│                           │
```

## Configuration Claude Code CLI

### Installation sur le serveur

```bash
# Installer Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Ou avec le script d'installation
curl -fsSL https://claude.ai/install-cli | bash
```

### Configuration

```bash
# Authentification
claude auth login

# Ou via variable d'environnement
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Fichier de configuration projet

Créer `templates/site-astro/CLAUDE.md` :

```markdown
# Instructions pour Claude Code

## Contexte
Tu génères des sites vitrines pour des clients.

## Structure du projet
- `src/` : Composants Astro
- `data/` : Contenu JSON
- `public/` : Assets statiques

## Règles
1. Utiliser les composants existants
2. Respecter la charte graphique (design-tokens.json)
3. Générer du contenu professionnel en français
4. Optimiser pour le SEO

## Fichiers à modifier
- `data/site.json` : Infos générales
- `data/content.json` : Textes des sections
- `src/styles/global.css` : Couleurs personnalisées
```

## Scripts de Génération

### Script principal : `generate-site.sh`

```bash
#!/bin/bash
set -e

CLIENT_NAME=$1
SOURCE_URL=$2

# Chemins
TEMPLATE_DIR="/app/templates/site-astro"
CLIENT_DIR="/app/storage/clients/$CLIENT_NAME"

echo "[10%] Préparation du répertoire client..."
mkdir -p "$CLIENT_DIR"
cp -r "$TEMPLATE_DIR/template/." "$CLIENT_DIR/"

echo "[20%] Configuration du client..."
cat > "$CLIENT_DIR/client-info.json" << EOF
{
  "name": "$CLIENT_NAME",
  "sourceUrl": "$SOURCE_URL"
}
EOF

echo "[30%] Analyse du site source..."
if [ -n "$SOURCE_URL" ]; then
  claude --cwd "$CLIENT_DIR" \
    "Analyse le site $SOURCE_URL et extrais les informations clés
     (activité, services, style, couleurs).
     Sauvegarde dans data/site.json"
fi

echo "[50%] Génération du contenu..."
claude --cwd "$CLIENT_DIR" \
  "En te basant sur client-info.json et data/site.json,
   génère le contenu complet du site dans data/content.json.
   Crée des textes professionnels et engageants."

echo "[70%] Personnalisation du design..."
claude --cwd "$CLIENT_DIR" \
  "Adapte src/styles/global.css avec les couleurs du client.
   Modifie les composants si nécessaire pour correspondre au style voulu."

echo "[90%] Validation..."
cd "$CLIENT_DIR"
npm install
npm run build

echo "[100%] Génération terminée!"
```

### Commandes Claude Code utilisées

```bash
# Analyse d'un site existant
claude --cwd /path/to/client \
  "Analyse https://site-existant.com et crée data/site.json avec les infos"

# Génération de contenu
claude --cwd /path/to/client \
  "Génère le contenu marketing pour data/content.json"

# Modification de code
claude --cwd /path/to/client \
  "Modifie src/components/Hero.astro pour ajouter une vidéo de fond"

# Validation
claude --cwd /path/to/client \
  "Vérifie que le site est complet et corrige les erreurs"
```

## Configuration Docker Production

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  dashboard:
    build:
      context: ./apps/dashboard
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/sitebuilder
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - ROOT_DIR=/app
      - SITE_ASTRO_DIR=/app/templates/site-astro
      - CLIENTS_DIR=/app/storage/clients
      - DOKPLOY_URL=${DOKPLOY_URL}
      - DOKPLOY_TOKEN=${DOKPLOY_TOKEN}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./templates:/app/templates:ro
      - ./storage:/app/storage
      - claude-config:/root/.claude
    depends_on:
      - db
    networks:
      - sitebuilder

  generator:
    build:
      context: .
      dockerfile: ./docker/generator/Dockerfile
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/sitebuilder
    volumes:
      - ./templates:/app/templates:ro
      - ./storage:/app/storage
      - claude-config:/root/.claude
    networks:
      - sitebuilder

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=sitebuilder
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - sitebuilder

volumes:
  postgres_data:
  claude-config:

networks:
  sitebuilder:
    driver: bridge
```

### Dockerfile Generator

```dockerfile
# docker/generator/Dockerfile
FROM node:20-alpine

# Installer les dépendances système
RUN apk add --no-cache git curl bash

# Installer Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Créer le répertoire de travail
WORKDIR /app

# Copier les scripts
COPY templates/site-astro/scripts /app/scripts

# Point d'entrée
ENTRYPOINT ["/bin/bash"]
```

## Sécurité Production

### Variables sensibles

Ne jamais commiter dans le repo :

```env
# .env.production (sur le serveur uniquement)
DB_PASSWORD=mot-de-passe-fort-genere
ADMIN_PASSWORD=mot-de-passe-admin-fort
DOKPLOY_TOKEN=dk_xxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### Permissions fichiers

```bash
# Storage en écriture pour le service
chmod 755 /app/storage
chmod 755 /app/storage/clients

# Templates en lecture seule
chmod 555 /app/templates
```

### Réseau

- Dashboard exposé via reverse proxy (Traefik/Nginx)
- PostgreSQL non exposé publiquement
- Communication interne via réseau Docker

## Monitoring

### Logs

```bash
# Logs dashboard
docker logs -f sitebuilder-dashboard

# Logs génération
docker logs -f sitebuilder-generator

# Logs spécifiques à un site
cat /app/storage/clients/mon-client/.generation-log
```

### Métriques à surveiller

| Métrique | Seuil alerte |
|----------|--------------|
| Jobs en attente | > 10 |
| Temps génération moyen | > 10 min |
| Erreurs génération | > 5% |
| Espace disque storage | > 80% |
| Tokens Claude/jour | Selon budget |

### Healthchecks

```yaml
# Dans docker-compose
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Backup

### Base de données

```bash
# Backup quotidien
pg_dump -h db -U postgres sitebuilder > backup-$(date +%Y%m%d).sql

# Restauration
psql -h db -U postgres sitebuilder < backup-20240208.sql
```

### Sites générés

```bash
# Backup storage
tar -czf storage-backup-$(date +%Y%m%d).tar.gz /app/storage/clients/

# Sync vers S3/Minio
aws s3 sync /app/storage/clients s3://sitebuilder-backups/clients/
```

## Scaling

### Horizontal

Pour gérer plus de générations simultanées :

```yaml
generator:
  deploy:
    replicas: 3
```

### Limites ressources

```yaml
generator:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
      reservations:
        cpus: '1'
        memory: 2G
```

## Coûts estimés

| Composant | Coût mensuel estimé |
|-----------|---------------------|
| VPS (4 CPU, 8GB RAM) | ~40€ |
| Tokens Claude (1000 sites/mois) | ~200€ |
| Stockage (100GB) | ~10€ |
| Domaines/SSL | Inclus Dokploy |
| **Total** | **~250€/mois** |
