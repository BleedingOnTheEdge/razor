# Multi-stage production Dockerfile for Razor Cloud Dashboard

# Stage 1: Build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.6.1 --activate
WORKDIR /app

# Copy monorepo dependency manifests and lockfiles
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY frontends/packages ./frontends/packages
COPY frontends/apps/cloud-dashboard ./frontends/apps/cloud-dashboard

# Install monorepo dependencies and compile standalone Next.js bundle
RUN pnpm install --frozen-lockfile
RUN pnpm --filter cloud-dashboard build

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

# Non-root user for enterprise container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/frontends/apps/cloud-dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontends/apps/cloud-dashboard/.next/static ./frontends/apps/cloud-dashboard/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontends/apps/cloud-dashboard/public ./frontends/apps/cloud-dashboard/public

USER nextjs

EXPOSE 3002

CMD ["node", "frontends/apps/cloud-dashboard/server.js"]
