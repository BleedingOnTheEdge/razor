# Multi-stage lean production Dockerfile for Razor Platform (Unified Container)
FROM node:22-bookworm-slim AS node-runtime

FROM mcr.microsoft.com/dotnet/aspnet:10.0

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install Nginx and curl for reverse proxy and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Node.js binary and modules from node runtime
COPY --from=node-runtime /usr/local /usr/local

# Copy pre-built backend and frontend artifacts
COPY dist/cloud /app/backend
COPY dist/dashboard /app/frontend

# Copy Nginx gateway configuration and entrypoint script
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Ensure persistent data directory exists for SQLite storage
RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
