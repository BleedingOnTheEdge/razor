#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Razor Unified Production Deployment                    "
echo "   Target: Runflare ASP.NET 10 Engine                     "
echo "   Project: storage-deploy (36052) | Item: razor (84129)  "
echo "   Ports: 5000 / 3000 (Cloud Control Plane + Web Console) "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "📦 1. Compiling Next.js Frontends (Dashboard & Marketplace)..."
pnpm --filter cloud-dashboard build
pnpm --filter marketplace build

echo "🧹 2. Staging pre-rendered frontend assets into wwwroot..."
python3 scripts/prepare-wwwroot.py

echo "🔨 3. Validating .NET 10 compilation for mywebapp..."
dotnet build mywebapp.csproj -c Release --no-restore

echo "🚀 4. Uploading and deploying to Runflare..."
RUNFLARE_BIN="$(command -v runflare || echo "${HOME}/.local/bin/runflare")"

# Temporarily comment out wwwroot in .gitignore so Runflare packager includes it
sed -i.bak -e 's|^wwwroot|# wwwroot|g' .gitignore 2>/dev/null || true
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
