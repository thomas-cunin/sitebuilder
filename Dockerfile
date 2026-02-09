FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY apps/dashboard/package.json apps/dashboard/package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/dashboard/ .

# Create public folder if it doesn't exist
RUN mkdir -p public

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install git, bash, Docker CLI, and Chromium for Claude Code CLI and Puppeteer
RUN apk add --no-cache \
    git \
    bash \
    curl \
    docker-cli \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configure Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install Claude Code CLI and Puppeteer globally
RUN npm install -g @anthropic-ai/claude-code puppeteer

# Make global npm modules available to scripts
ENV NODE_PATH=/usr/local/lib/node_modules

# Create a non-root user for Claude CLI (--dangerously-skip-permissions doesn't work as root)
RUN addgroup -g 1001 -S claude && \
    adduser -S -u 1001 -G claude claude

# Create directories for Claude auth and data
RUN mkdir -p /root/.claude /home/claude/.claude /data/templates /data/storage && \
    chown -R claude:claude /home/claude/.claude

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy templates into the image
COPY templates/ /data/templates/

# Make Claude wrapper executable and set permissions
RUN chmod +x /data/templates/site-astro/scripts/run-claude.sh && \
    chown -R claude:claude /data/templates /data/storage

# Install template dependencies (for puppeteer scripts)
WORKDIR /data/templates/site-astro
RUN npm install --production=false
WORKDIR /app

# Create storage directory for generated sites
RUN mkdir -p /data/storage/clients && \
    chown -R claude:claude /data/storage/clients

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV ROOT_DIR=/app
ENV SITE_ASTRO_DIR=/data/templates/site-astro
ENV CLIENTS_DIR=/data/storage/clients

CMD ["node", "server.js"]
