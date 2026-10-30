#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Razor Unified Production Container Deployment          "
echo "   Target: Runflare Docker Engine                         "
echo "   Project: storage-deploy (36052) | Item: razor (86623)  "
echo "   Exposed Port: 3000 (Unified Gateway: Cloud + Web + Market)"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "🧹 1. Cleaning up previous distribution artifacts..."
rm -rf dist 2>/dev/null || true
mkdir -p dist/cloud dist/dashboard dist/marketplace

echo "🔨 2. Compiling and publishing .NET 10 Cloud backend..."
dotnet publish core/src/Cloud/Cloud.csproj -c Release -o dist/cloud

echo "📦 3. Compiling Next.js Cloud Dashboard..."
export NEXT_PUBLIC_API_BASE_URL=""
export NEXT_PUBLIC_DASHBOARD_URL="/"
export NEXT_PUBLIC_MARKETPLACE_URL="/marketplace"
pnpm --filter cloud-dashboard build
rm -rf dist/dashboard-staging 2>/dev/null || true
mkdir -p dist/dashboard-staging
cp -a frontends/apps/cloud-dashboard/.next/standalone/. dist/dashboard-staging/
mkdir -p dist/dashboard-staging/frontends/apps/cloud-dashboard/.next
cp -a frontends/apps/cloud-dashboard/.next/static dist/dashboard-staging/frontends/apps/cloud-dashboard/.next/
if [ -d "frontends/apps/cloud-dashboard/public" ]; then
  cp -a frontends/apps/cloud-dashboard/public dist/dashboard-staging/frontends/apps/cloud-dashboard/
fi
# Prune typescript and sharp bloat from staging
rm -rf dist/dashboard-staging/node_modules/.pnpm/typescript* dist/dashboard-staging/node_modules/typescript dist/dashboard-staging/node_modules/.pnpm/@img* dist/dashboard-staging/node_modules/.pnpm/sharp* 2>/dev/null || true
echo "📦 Compressing dashboard standalone package (bypassing forceIgnore)..."
tar -czf dist/dashboard.tar.gz -C dist/dashboard-staging .
rm -rf dist/dashboard-staging

echo "📦 4. Compiling Next.js Marketplace..."
pnpm --filter marketplace build
rm -rf dist/marketplace-staging 2>/dev/null || true
mkdir -p dist/marketplace-staging
cp -a frontends/apps/marketplace/.next/standalone/. dist/marketplace-staging/
mkdir -p dist/marketplace-staging/frontends/apps/marketplace/.next
cp -a frontends/apps/marketplace/.next/static dist/marketplace-staging/frontends/apps/marketplace/.next/
if [ -d "frontends/apps/marketplace/public" ]; then
  cp -a frontends/apps/marketplace/public dist/marketplace-staging/frontends/apps/marketplace/
fi
# Prune typescript and sharp bloat from staging
rm -rf dist/marketplace-staging/node_modules/.pnpm/typescript* dist/marketplace-staging/node_modules/typescript dist/marketplace-staging/node_modules/.pnpm/@img* dist/marketplace-staging/node_modules/.pnpm/sharp* 2>/dev/null || true
echo "📦 Compressing marketplace standalone package (bypassing forceIgnore)..."
tar -czf dist/marketplace.tar.gz -C dist/marketplace-staging .
rm -rf dist/marketplace-staging

echo "✂️ 4b. Pruning non-essential runtime bloat..."
find dist/cloud/runtimes -mindepth 1 -maxdepth 1 ! -name "linux-x64" -exec rm -rf {} + 2>/dev/null || true
find dist -type f \( -name "*.pdb" -o -name "*.map" -o -name "*.xml" \) -delete 2>/dev/null || true
rm -rf dist/dashboard dist/marketplace 2>/dev/null || true

echo "🚀 5. Uploading and deploying container to Runflare..."
RUNFLARE_BIN="$(command -v runflare || echo "${HOME}/.local/bin/runflare")"

# Backup ignore files and create unified deployment ignore rules
cp .gitignore .gitignore.bak 2>/dev/null || true
cp .runflareignore .runflareignore.bak 2>/dev/null || true

cat << 'EOF' > .gitignore
/.git
/.github
/.nx
/.agents
/.ep
/node_modules
/.next
/data
*.log
*.sqlite
*.sqlite*
/bin
/core
/frontends
/mobile
/templates
/tests
/docs
/samples
/scripts
*.md
.env
.env.*
!.env.example
EOF

cp .gitignore .runflareignore

restore_ignores() {
  if [ -f .gitignore.bak ]; then
    mv .gitignore.bak .gitignore 2>/dev/null || true
  fi
  if [ -f .runflareignore.bak ]; then
    mv .runflareignore.bak .runflareignore 2>/dev/null || true
  fi
}
trap restore_ignores EXIT INT TERM

python3 -c "
import pty, os, sys, subprocess, struct, termios, fcntl, time

env = os.environ.copy()
env['TERM'] = 'xterm-256color'

cmd = [
    '${RUNFLARE_BIN}',
    'deploy',
    '--project-id', '36052',
    '--item-id', '86623',
    '-y',
    '--force'
]

max_retries = 3
for attempt in range(1, max_retries + 1):
    print(f'\\n🚀 Starting deployment attempt {attempt}/{max_retries}...')
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 100, 0, 0))
    proc = subprocess.Popen(cmd, stdin=slave, stdout=slave, stderr=slave, close_fds=True, env=env)
    os.close(slave)

    try:
        while True:
            try:
                data = os.read(master, 1024)
                if not data:
                    break
                sys.stdout.buffer.write(data)
                sys.stdout.buffer.flush()
            except OSError:
                break
    finally:
        os.close(master)

    ret = proc.wait()
    if ret == 0:
        sys.exit(0)
    print(f'\\n⚠️ Deployment attempt {attempt} failed with exit code {ret}', file=sys.stderr)
    if attempt < max_retries:
        print('⏳ Waiting 5 seconds before retrying deployment...', file=sys.stderr)
        time.sleep(5)

sys.exit(ret)
"

echo "✅ Razor deployment to Runflare completed successfully!"
