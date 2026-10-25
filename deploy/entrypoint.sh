#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Razor Unified Production Container Starting...         "
echo "=========================================================="

mkdir -p /app/data

# Ensure defaults for Cloud Control Plane if not provided
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Production}"
export ASPNETCORE_URLS="http://127.0.0.1:5000"
export CLOUD_MANAGEMENT_API_KEY="${CLOUD_MANAGEMENT_API_KEY:-dev-cloud-management-key-3000}"
export CLOUD_DB_CONNECTION="${CLOUD_DB_CONNECTION:-Data Source=/app/data/razor_cloud.db}"

echo "🚀 Starting Razor Cloud Control Plane (Internal Port 5000)..."
cd /app/backend
dotnet Cloud.dll &
BACKEND_PID=$!

echo "🚀 Starting Razor Cloud Dashboard (Internal Port 3002)..."
cd /app/frontend
PORT=3002 HOSTNAME=127.0.0.1 node frontends/apps/cloud-dashboard/server.js &
FRONTEND_PID=$!

if [ -d "/app/marketplace" ]; then
    echo "🚀 Starting Razor Marketplace (Internal Port 3001)..."
    cd /app/marketplace
    PORT=3001 HOSTNAME=127.0.0.1 node frontends/apps/marketplace/server.js &
    MARKETPLACE_PID=$!
fi

cleanup() {
    echo "🛑 Shutting down Razor processes..."
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    if [ -n "$MARKETPLACE_PID" ]; then
        kill -TERM "$MARKETPLACE_PID" 2>/dev/null || true
    fi
    nginx -s stop 2>/dev/null || true
    wait
    exit 0
}

trap cleanup SIGTERM SIGINT SIGQUIT

# Wait for backend and frontend readiness
echo "⏳ Waiting for internal services to be ready..."
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:5000 > /dev/null 2>&1 || [ -f /app/data/razor_cloud.db ]; then
        echo "✅ Backend responsive."
        break
    fi
    sleep 1
done

echo "🚀 Starting Gateway Reverse Proxy (Public Port 3000)..."
nginx -g "daemon off;" &
NGINX_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID" "$NGINX_PID"
cleanup
