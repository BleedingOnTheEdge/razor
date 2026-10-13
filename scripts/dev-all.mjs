#!/usr/bin/env node
// -----------------------------------------------------------------------------
// <copyright file="dev-all.mjs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';

// ANSI Color definitions
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

const SERVICES = [
  {
    id: 'cloud',
    name: 'Cloud API',
    tag: '[cloud]',
    color: CYAN,
    command: 'dotnet',
    args: ['run', '--project', 'core/src/Cloud/Cloud.csproj'],
    cwd: REPO_ROOT,
    port: 5000,
    category: 'backend',
  },
  {
    id: 'engine',
    name: 'Engine',
    tag: '[engine]',
    color: MAGENTA,
    command: process.execPath,
    args: [
      path.join(__dirname, 'run-engine.mjs'),
      '--development',
      '--endpoint',
      'ws://localhost:5000/engine',
    ],
    cwd: REPO_ROOT,
    category: 'backend',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    tag: '[market]',
    color: GREEN,
    command: 'pnpm',
    args: ['--filter', 'marketplace', 'dev'],
    cwd: REPO_ROOT,
    port: 3001,
    category: 'frontend',
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    tag: '[dash]  ',
    color: BLUE,
    command: 'pnpm',
    args: ['--filter', 'cloud-dashboard', 'dev'],
    cwd: REPO_ROOT,
    port: 3002,
    category: 'frontend',
  },
];

const runningChildren = [];
let isShuttingDown = false;

/**
 * Checks whether a given TCP port is in use.
 */
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true); // Port in use
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      resolve(false); // Connection refused, port is free
    });

    socket.connect(port, '127.0.0.1');
  });
}

/**
 * Attaches a prefixed stream reader to a child process's stream.
 */
function attachLogger(stream, tag, color) {
  if (!stream) return;
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    console.log(`${color}${BOLD}${tag}${RESET} ${line}`);
  });
}

/**
 * Gracefully terminates all active child processes.
 */
function shutdownAll(signal = 'SIGINT') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${YELLOW}${BOLD}[dev:all] Received shutdown signal (${signal}). Terminating all services...${RESET}`);

  for (const item of runningChildren) {
    const { child, service } = item;
    if (!child.killed) {
      console.log(`${DIM}[dev:all] Stopping ${service.name}...${RESET}`);
      try {
        if (isWindows) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F']);
        } else {
          try {
            process.kill(-child.pid, 'SIGINT');
          } catch {
            child.kill('SIGINT');
          }
        }
      } catch (err) {
        console.warn(`[dev:all] Error stopping ${service.name}: ${err.message}`);
      }
    }
  }

  setTimeout(() => {
    console.log(`${GREEN}[dev:all] All services shut down cleanly.${RESET}`);
    process.exit(0);
  }, 1000);
}

/**
 * Main launcher routine.
 */
async function main() {
  const args = process.argv.slice(2);
  const backendsOnly = args.includes('--backends') || args.includes('-b');
  const frontendsOnly = args.includes('--frontends') || args.includes('-f');
  const noEngine = args.includes('--no-engine');

  console.log(`${BOLD}============================================================${RESET}`);
  console.log(`${BOLD}       Razor Monorepo Unified Service Orchestrator          ${RESET}`);
  console.log(`${BOLD}============================================================${RESET}\n`);

  let selectedServices = SERVICES.slice();
  if (backendsOnly) {
    selectedServices = selectedServices.filter((s) => s.category === 'backend');
  } else if (frontendsOnly) {
    selectedServices = selectedServices.filter((s) => s.category === 'frontend');
  }

  if (noEngine) {
    selectedServices = selectedServices.filter((s) => s.id !== 'engine');
  }

  console.log(`${DIM}Services to launch:${RESET}`);
  for (const s of selectedServices) {
    const portInfo = s.port ? ` (Port ${s.port})` : '';
    console.log(`  • ${s.color}${BOLD}${s.name}${RESET}${portInfo} [${s.category}]`);
  }
  console.log('');

  // Pre-flight port checks and filtering
  const toSpawn = [];
  for (const s of selectedServices) {
    if (s.port) {
      const inUse = await checkPortInUse(s.port);
      if (inUse) {
        console.log(
          `${YELLOW}[dev:all] Port ${s.port} is already active. ${s.name} is already running — leaving active.${RESET}`
        );
        continue;
      }
    }
    toSpawn.push(s);
  }

  if (toSpawn.length === 0) {
    console.log(`${GREEN}[dev:all] All requested services are already running!${RESET}\n`);
    return;
  }

  console.log(`${DIM}Press Ctrl+C at any time to shut down spawned services.${RESET}\n`);

  // Handle process shutdown signals
  process.on('SIGINT', () => shutdownAll('SIGINT'));
  process.on('SIGTERM', () => shutdownAll('SIGTERM'));

  for (const service of toSpawn) {
    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: !isWindows,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });

    attachLogger(child.stdout, service.tag, service.color);
    attachLogger(child.stderr, service.tag, RED);

    runningChildren.push({ child, service });

    child.on('exit', (code, signal) => {
      if (!isShuttingDown) {
        console.log(
          `${service.color}${BOLD}${service.tag}${RESET} ${RED}Exited with code ${code ?? signal}${RESET}`
        );
      }
    });

    child.on('error', (err) => {
      console.error(
        `${service.color}${BOLD}${service.tag}${RESET} ${RED}Spawn error: ${err.message}${RESET}`
      );
    });
  }
}

main().catch((err) => {
  console.error(`${RED}[dev:all] Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
