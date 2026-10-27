#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Razor Unified Production Container Deployment          "
echo "   Target: Runflare Docker Engine                         "
echo "   Project: storage-deploy (36052) | Item: razor (84129)  "
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
pnpm --filter cloud-dashboard build
cp -a frontends/apps/cloud-dashboard/.next/standalone/. dist/dashboard/
mkdir -p dist/dashboard/frontends/apps/cloud-dashboard/.next
cp -a frontends/apps/cloud-dashboard/.next/static dist/dashboard/frontends/apps/cloud-dashboard/.next/
if [ -d "frontends/apps/cloud-dashboard/public" ]; then
  cp -a frontends/apps/cloud-dashboard/public dist/dashboard/frontends/apps/cloud-dashboard/
fi

echo "📦 4. Compiling Next.js Marketplace..."
pnpm --filter marketplace build
cp -a frontends/apps/marketplace/.next/standalone/. dist/marketplace/
mkdir -p dist/marketplace/frontends/apps/marketplace/.next
cp -a frontends/apps/marketplace/.next/static dist/marketplace/frontends/apps/marketplace/.next/
if [ -d "frontends/apps/marketplace/public" ]; then
  cp -a frontends/apps/marketplace/public dist/marketplace/frontends/apps/marketplace/
fi

echo "🚀 5. Uploading and deploying container to Runflare..."
RUNFLARE_BIN="$(command -v runflare || echo "${HOME}/.local/bin/runflare")"

# Temporarily comment out dist in .gitignore so Runflare packager includes it
sed -i.bak -e 's|^dist|# dist|g' .gitignore 2>/dev/null || true
restore_gitignore() {
  if [ -f .gitignore.bak ]; then
    mv .gitignore.bak .gitignore 2>/dev/null || true
  fi
}
trap restore_gitignore EXIT INT TERM

python3 -c "
import pty, os, sys, subprocess, struct, termios, fcntl

master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 100, 0, 0))

env = os.environ.copy()
env['TERM'] = 'xterm-256color'

cmd = [
    '${RUNFLARE_BIN}',
    'deploy',
    '--project-id', '36052',
    '--item-id', '84129',
    '-y',
    '--force'
]

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
if ret != 0:
    print(f'\n❌ Deployment exited with code {ret}', file=sys.stderr)
sys.exit(ret)
"

echo "✅ Razor deployment to Runflare completed successfully!"
