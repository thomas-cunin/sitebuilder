# Sitebuilder

## Qu'est-ce que c'est

Plateforme de génération automatique de sites vitrines par IA. Le dashboard permet de créer des sites clients en remplissant un formulaire, puis de les générer via Claude Code CLI et de les déployer sur Dokploy.

## Stack technique

| Composant | Solution |
|---|---|
| **Dashboard** | Next.js 15, App Router, TypeScript, Tailwind, shadcn/ui |
| **Base de données** | PostgreSQL 16 + Prisma |
| **Auth** | Cookie session (bcrypt) |
| **Templates** | Astro + Tailwind CSS |
| **IA Génération** | Claude Code CLI |
| **Déploiement** | Dokploy (Docker Swarm) |

## Déploiement Production

### Serveur

| Élément | Valeur |
|---------|--------|
| **IP** | 152.228.131.87 |
| **SSH** | `ssh debian@152.228.131.87` |
| **Dashboard** | https://sitebuilder.152.228.131.87.sslip.io |
| **Mot de passe** | `sitebuilder2025` |

### IDs Dokploy

```
Projet:       EbkLb37RDCfJD2XgvZiLu
Application:  pFlojgjGuVhITusg_dRcc
PostgreSQL:   LH56GpA-qQHDOOlwVEuPN
API Token:    claude_api_QCzoykHZWLQQEvHXwuRVPXTavrqbnzFvlhxlYlQVyyDFAIOiuqSnyDVZQtFXUeev
```

### Base de données

```
Host:     sitebuilder-postgres-krasex:5432
Database: sitebuilder
User:     sitebuilder
Password: sb_db_2025_secure
```

**Documentation complète : `docs/SETUP-DOKPLOY.md`**

## Structure du projet

```
sitebuilder/
├── CLAUDE.md                    # Ce fichier (contexte projet)
├── apps/
│   └── dashboard/               # Dashboard Next.js
│       ├── src/
│       │   ├── app/             # Pages et API routes
│       │   ├── components/      # Composants UI
│       │   └── lib/             # Logique métier
│       ├── prisma/schema.prisma # Schéma BDD
│       └── Dockerfile
├── templates/
│   └── site-astro/              # Template Astro pour les sites
│       ├── scripts/             # Scripts de génération IA
│       │   ├── creative-generate.js
│       │   └── generate-site.js
│       └── template/            # Fichiers template de base
├── storage/
│   └── clients/                 # Sites générés (par client)
├── docs/
│   ├── SETUP-DOKPLOY.md         # Config Dokploy détaillée
│   ├── PRODUCTION.md            # Architecture production
│   └── CLAUDE-CODE-INTEGRATION.md
└── docker-compose.yml
```

## Commandes essentielles

### Serveur production

```bash
# SSH
ssh debian@152.228.131.87

# Logs dashboard
sudo docker service logs sitebuilder-dashboard-n9yznn -f

# Entrer dans le container
sudo docker exec -it $(sudo docker ps --filter 'name=sitebuilder-dashboard' -q) /bin/bash

# Claude CLI login (une fois)
claude auth login
```

## Git

- **Repo** : https://github.com/thomas-cunin/sitebuilder
- **Branche** : `main`
