# Multi-stage production Dockerfile for Razor Marketplace
# Stage 1: Build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.6.1 --activate
WORKDIR /app

# Copy monorepo dependency manifests and lockfiles
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY frontends/packages ./frontends/packages
COPY frontends/apps/marketplace ./frontends/apps/marketplace

# Install monorepo dependencies and compile standalone Next.js bundle
RUN pnpm install --frozen-lockfile
RUN pnpm --filter marketplace build

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Non-root user for enterprise container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/frontends/apps/marketplace/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontends/apps/marketplace/.next/static ./frontends/apps/marketplace/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontends/apps/marketplace/public ./frontends/apps/marketplace/public

USER nextjs

EXPOSE 3001

CMD ["node", "frontends/apps/marketplace/server.js"]
