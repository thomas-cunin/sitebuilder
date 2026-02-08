# Setup Dokploy - Sitebuilder

## Informations Serveur

| Élément | Valeur |
|---------|--------|
| **IP** | 152.228.131.87 |
| **SSH** | `ssh debian@152.228.131.87` |
| **OS** | Debian 12 (Bookworm) |
| **Docker** | v28.5.0 (Swarm mode) |

## Accès Dokploy

| Élément | Valeur |
|---------|--------|
| **URL** | https://152.228.131.87:3000 |
| **API Token** | `claude_api_QCzoykHZWLQQEvHXwuRVPXTavrqbnzFvlhxlYlQVyyDFAIOiuqSnyDVZQtFXUeev` |
| **Header API** | `x-api-key: <token>` |

## Projet Sitebuilder

### IDs Dokploy

```
Projet:       EbkLb37RDCfJD2XgvZiLu
Environment:  IzK8a6wNv8oP3cXEHrpbT
Application:  pFlojgjGuVhITusg_dRcc
PostgreSQL:   LH56GpA-qQHDOOlwVEuPN
```

### Application Dashboard

| Élément | Valeur |
|---------|--------|
| **Nom Dokploy** | `sitebuilder-dashboard-n9yznn` |
| **URL** | https://sitebuilder.152.228.131.87.sslip.io |
| **Mot de passe** | `sitebuilder2025` |
| **Source** | GitHub `thomas-cunin/sitebuilder` |
| **Branche** | `main` |
| **Build Path** | `apps/dashboard` |
| **Build Type** | Dockerfile |

### PostgreSQL

| Élément | Valeur |
|---------|--------|
| **Nom Dokploy** | `sitebuilder-postgres-krasex` |
| **Image** | `postgres:16-alpine` |
| **Database** | `sitebuilder` |
| **User** | `sitebuilder` |
| **Password** | `sb_db_2025_secure` |
| **Host interne** | `sitebuilder-postgres-krasex:5432` |

### Variables environnement

```env
DATABASE_URL=postgresql://sitebuilder:sb_db_2025_secure@sitebuilder-postgres-krasex:5432/sitebuilder?schema=public
ADMIN_PASSWORD=sitebuilder2025
ROOT_DIR=/app
SITE_ASTRO_DIR=/data/templates/site-astro
CLIENTS_DIR=/data/storage/clients
DOKPLOY_URL=https://152.228.131.87
DOKPLOY_TOKEN=claude_api_QCzoykHZWLQQEvHXwuRVPXTavrqbnzFvlhxlYlQVyyDFAIOiuqSnyDVZQtFXUeev
```

### Volumes montés

| Chemin Container | Chemin Host | Description |
|------------------|-------------|-------------|
| `/data` | `/home/debian/sitebuilder` | Code source, templates, storage |
| `/root/.claude` | `/home/debian/.claude` | Auth Claude Code CLI |

## Commandes utiles

### SSH et Docker

```bash
# Connexion serveur
ssh debian@152.228.131.87

# Voir les containers
sudo docker ps --filter name=sitebuilder

# Logs dashboard
sudo docker service logs sitebuilder-dashboard-n9yznn --tail 100 -f

# Entrer dans le container dashboard
sudo docker exec -it $(sudo docker ps --filter name=sitebuilder-dashboard -q) /bin/bash

# Redémarrer le service
sudo docker service update --force sitebuilder-dashboard-n9yznn
```

### Claude Code CLI (dans le container)

```bash
# Login (une seule fois, persisté via volume)
claude auth login

# Vérifier version
claude --version
```

### API Dokploy

```bash
# Redéployer
curl -s http://localhost:3000/api/trpc/application.deploy \
  -X POST \
  -H x-api-key: claude_api_QCzoykHZWLQQEvHXwuRVPXTavrqbnzFvlhxlYlQVyyDFAIOiuqSnyDVZQtFXUeev \
  -H Content-Type: application/json \
  -d {json:{applicationId:pFlojgjGuVhITusg_dRcc}}
```

## Architecture Docker Swarm

```
dokploy-network (overlay)
│
├── dokploy (port 3000) - Interface Dokploy
├── dokploy-postgres - BDD interne Dokploy
├── dokploy-traefik (ports 80, 443) - Reverse proxy
│
├── sitebuilder-postgres-krasex - PostgreSQL Sitebuilder
└── sitebuilder-dashboard-n9yznn - Dashboard Next.js
    ├── Claude Code CLI installé
    ├── Volume: /data → /home/debian/sitebuilder
    └── Volume: /root/.claude → /home/debian/.claude
```
