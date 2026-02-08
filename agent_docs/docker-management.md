# Docker Management

## Architecture des conteneurs

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  orchestrator (Next.js 15)                          │    │
│  │  - Port: 3000                                       │    │
│  │  - Volume: ./storage + Docker socket                │    │
│  │  - Label: app.localhost                             │    │
│  └──────────┬──────────────────────────────────────────┘    │
│             │                                               │
│  ┌──────────▼──────────┐  ┌────────────────────────────┐    │
│  │  redis               │  │  minio                      │    │
│  │  - Port: 6379        │  │  - Port: 9000 (API)         │    │
│  │  - BullMQ queue      │  │  - Port: 9001 (Console)     │    │
│  └──────────────────────┘  │  - Label: storage.localhost │    │
│                            └────────────────────────────┘    │
│  ┌──────────────────────┐  ┌────────────────────────────┐    │
│  │  postgres             │  │  traefik                    │    │
│  │  - Port: 5432         │  │  - Port: 80                 │    │
│  │  - DB: sitebuilder    │  │  - Routing dynamique        │    │
│  └──────────────────────┘  └────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  preview-{projectId} (créés dynamiquement)           │    │
│  │  - Next.js + Payload CMS                            │    │
│  │  - Port dynamique (3001, 3002, ...)                 │    │
│  │  - Label: {projectId}.preview.localhost             │    │
│  │  - Volume: ./storage/projects/{id}/site             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Docker Compose principal

```yaml
# docker-compose.yml
version: "3.8"

services:
  orchestrator:
    build:
      context: .
      dockerfile: docker/orchestrator/Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./storage:/app/storage
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/sitebuilder
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.orchestrator.rule=Host(`app.localhost`)"
      - "traefik.http.services.orchestrator.loadbalancer.server.port=3000"
    networks:
      - sitebuilder-network

  postgres:
    image: postgres:17-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=sitebuilder
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d sitebuilder"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - sitebuilder-network

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - sitebuilder-network

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - miniodata:/data
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    ports:
      - "9001:9001"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.minio.rule=Host(`storage.localhost`)"
      - "traefik.http.services.minio.loadbalancer.server.port=9001"
    networks:
      - sitebuilder-network

  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - sitebuilder-network

volumes:
  pgdata:
  redisdata:
  miniodata:

networks:
  sitebuilder-network:
    driver: bridge
```

---

## Dockerfile Orchestrateur

```dockerfile
# docker/orchestrator/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY apps/orchestrator/package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/orchestrator .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

---

## Dockerfile Preview Base

```dockerfile
# docker/preview-base/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Les dépendances communes sont pré-installées
# Le code source est monté en volume

RUN apk add --no-cache libc6-compat

# Installation des dépendances au démarrage
COPY docker/preview-base/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]
```

**Entrypoint** :
```bash
#!/bin/sh
# docker/preview-base/entrypoint.sh
cd /app
if [ ! -d "node_modules" ]; then
  npm install
fi
exec "$@"
```

---

## Création dynamique de conteneurs preview

L'orchestrateur utilise `dockerode` pour créer des conteneurs à la volée :

```typescript
import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

async function launchPreview(projectId: string): Promise<string> {
  const containerName = `preview-${projectId}`;

  // Vérifier si le conteneur existe déjà
  const containers = await docker.listContainers({ all: true });
  const existing = containers.find(c => c.Names.includes(`/${containerName}`));

  if (existing) {
    const container = docker.getContainer(existing.Id);
    if (existing.State !== "running") {
      await container.start();
    }
    return `http://${projectId}.preview.localhost`;
  }

  // Créer le conteneur
  const container = await docker.createContainer({
    Image: "preview-base:latest",
    name: containerName,
    HostConfig: {
      Binds: [
        `${process.cwd()}/storage/projects/${projectId}/site:/app`,
      ],
      NetworkMode: "sitebuilder-network",
    },
    Env: [
      `PAYLOAD_SECRET=${generateSecret()}`,
      `NEXT_PUBLIC_SITE_URL=http://${projectId}.preview.localhost`,
    ],
    Labels: {
      "traefik.enable": "true",
      [`traefik.http.routers.preview-${projectId}.rule`]: `Host(\`${projectId}.preview.localhost\`)`,
      [`traefik.http.services.preview-${projectId}.loadbalancer.server.port`]: "3000",
    },
    ExposedPorts: { "3000/tcp": {} },
  });

  await container.start();
  return `http://${projectId}.preview.localhost`;
}

async function stopPreview(projectId: string): Promise<void> {
  const container = docker.getContainer(`preview-${projectId}`);
  await container.stop();
}

async function removePreview(projectId: string): Promise<void> {
  const container = docker.getContainer(`preview-${projectId}`);
  await container.stop();
  await container.remove();
}
```

---

## Gestion du cycle de vie

### Création
1. Le pipeline atteint l'étape 7
2. L'orchestrateur appelle `launchPreview(projectId)`
3. Le conteneur est créé avec les labels Traefik
4. L'URL est stockée en base

### Arrêt
- Inactivité > 1h → arrêt automatique
- L'utilisateur ferme la preview → arrêt
- Le projet est supprimé → conteneur supprimé

### Nettoyage automatique
Un cron job nettoie les conteneurs :
- Conteneurs arrêtés depuis > 24h → supprimés
- Conteneurs sans projet associé → supprimés

---

## Sécurité

1. **Socket Docker** : Accès en lecture seule pour Traefik, lecture/écriture pour l'orchestrateur
2. **Network isolation** : Tous les services sur `sitebuilder-network`
3. **Pas de mode privileged** : Les conteneurs preview n'ont pas d'accès élevé
4. **Volumes restreints** : Seul le dossier du projet est monté

---

## Commandes utiles

```bash
# Démarrer l'infra
docker compose up -d

# Vérifier les services
docker compose ps

# Logs d'un service
docker compose logs -f orchestrator

# Rebuilder l'orchestrateur
docker compose build orchestrator

# Lister les conteneurs preview
docker ps --filter "name=preview-"

# Supprimer tous les conteneurs preview
docker rm -f $(docker ps -a -q --filter "name=preview-")

# Inspecter un conteneur
docker inspect preview-{projectId}
```
