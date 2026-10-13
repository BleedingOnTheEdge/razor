#!/usr/bin/env node
// -----------------------------------------------------------------------------
// <copyright file="run-engine.mjs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const BIN_DIR = path.join(REPO_ROOT, 'bin');
const EXECUTABLE_NAME = isWindows ? 'Engine.exe' : 'Engine';
const EXECUTABLE_PATH = path.join(BIN_DIR, EXECUTABLE_NAME);

/**
 * Ensures the native Engine executable exists; if absent, builds it.
 */
function ensureExecutable() {
  if (fs.existsSync(EXECUTABLE_PATH)) {
    return true;
  }

  console.log(`\x1b[33m[engine] Executable not found at ${EXECUTABLE_PATH}.\x1b[0m`);
  console.log('\x1b[36m[engine] Building standalone Engine executable for host system...\x1b[0m\n');

  const buildScript = path.join(__dirname, 'build-engine.mjs');
  const buildResult = spawnSync(process.execPath, [buildScript], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (buildResult.status !== 0 || !fs.existsSync(EXECUTABLE_PATH)) {
    console.error(`\x1b[31m[engine] Failed to build executable at ${EXECUTABLE_PATH}\x1b[0m`);
    return false;
  }

  return true;
}

/**
 * Main execution function.
 */
function main() {
  if (!ensureExecutable()) {
    process.exit(1);
  }

  const userArgs = process.argv.slice(2);

  // Spawn the native standalone Engine executable directly
  const child = spawn(EXECUTABLE_PATH, userArgs, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  // Relay process termination signals gracefully
  const forwardSignal = (signal) => {
    if (child && !child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  child.on('error', (err) => {
    console.error(`\x1b[31m[engine] Failed to execute ${EXECUTABLE_PATH}: ${err.message}\x1b[0m`);
    process.exit(1);
  });
}

main();
