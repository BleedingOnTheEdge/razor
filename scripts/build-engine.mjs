#!/usr/bin/env node
// -----------------------------------------------------------------------------
// <copyright file="build-engine.mjs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const ENGINE_CSPROJ = path.join(REPO_ROOT, 'core', 'src', 'Engine', 'Engine.csproj');

const COMMON_RIDS = [
  'linux-x64',
  'linux-arm64',
  'win-x64',
  'win-arm64',
  'osx-x64',
  'osx-arm64',
];

/**
 * Resolves current host RID based on process.platform and process.arch.
 */
function resolveHostRid() {
  const platform = process.platform;
  const arch = process.arch;

  let osPrefix = 'linux';
  if (platform === 'win32') {
    osPrefix = 'win';
  } else if (platform === 'darwin') {
    osPrefix = 'osx';
  } else if (platform === 'linux') {
    osPrefix = 'linux';
  }

  const archSuffix = arch === 'arm64' ? 'arm64' : 'x64';
  return `${osPrefix}-${archSuffix}`;
}

/**
 * Returns executable binary name for a given RID.
 */
function getBinaryName(rid) {
  return rid.startsWith('win-') ? 'Engine.exe' : 'Engine';
}

/**
 * Formats bytes into a human-readable string.
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Publishes Engine for a specific RID.
 */
function publishRid(rid, outDir, isHostLocal = false) {
  console.log(`\x1b[36m[build:engine]\x1b[0m Compiling standalone executable for \x1b[1m${rid}\x1b[0m...`);
  const startTime = Date.now();

  fs.mkdirSync(outDir, { recursive: true });

  const args = [
    'publish',
    ENGINE_CSPROJ,
    '--configuration', 'Release',
    '--runtime', rid,
    '--self-contained', 'true',
    '-p:PublishSingleFile=true',
    '-p:IncludeNativeLibrariesForSelfExtract=true',
    '--output', outDir,
  ];

  const result = spawnSync('dotnet', args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\x1b[31m[build:engine] Error: dotnet publish failed for ${rid} (exit code ${result.status})\x1b[0m`);
    return false;
  }

  const binaryName = getBinaryName(rid);
  const binaryPath = path.join(outDir, binaryName);

  if (!fs.existsSync(binaryPath)) {
    console.error(`\x1b[31m[build:engine] Error: Expected binary not found at ${binaryPath}\x1b[0m`);
    return false;
  }

  // Ensure POSIX execute permissions
  if (!rid.startsWith('win-')) {
    try {
      fs.chmodSync(binaryPath, 0o755);
    } catch (err) {
      console.warn(`[build:engine] Warning: Unable to chmod ${binaryPath}: ${err.message}`);
    }
  }

  // If local host build, create convenient lowercase symlink or copy
  if (isHostLocal && !rid.startsWith('win-')) {
    const lowercaseAlias = path.join(outDir, 'engine');
    try {
      if (fs.existsSync(lowercaseAlias)) {
        fs.unlinkSync(lowercaseAlias);
      }
      fs.symlinkSync(binaryName, lowercaseAlias);
    } catch {
      // Symlink failed, non-fatal
    }
  }

  const stat = fs.statSync(binaryPath);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\x1b[32m[build:engine] Success:\x1b[0m ${binaryPath} (${formatBytes(stat.size)}) compiled in ${elapsed}s`
  );
  return true;
}

/**
 * Main execution routine.
 */
function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all') || args.includes('-a');
  const ridIndex = args.indexOf('--rid');
  const customRid = ridIndex !== -1 && args[ridIndex + 1] ? args[ridIndex + 1] : null;

  console.log('\x1b[1m=== Razor Engine Standalone Executable Builder ===\x1b[0m\n');

  if (isAll) {
    console.log(`Building cross-platform matrix for: ${COMMON_RIDS.join(', ')}\n`);
    let failures = 0;
    for (const rid of COMMON_RIDS) {
      const outDir = path.join(REPO_ROOT, 'artifacts', 'engine', rid);
      const success = publishRid(rid, outDir, false);
      if (!success) failures++;
    }

    if (failures > 0) {
      console.error(`\n\x1b[31m[build:engine] Build finished with ${failures} failure(s).\x1b[0m`);
      process.exit(1);
    }
    console.log(`\n\x1b[32m[build:engine] All target executables successfully published to artifacts/engine/.\x1b[0m`);
    return;
  }

  if (customRid) {
    const outDir = path.join(REPO_ROOT, 'artifacts', 'engine', customRid);
    const success = publishRid(customRid, outDir, false);
    if (!success) {
      process.exit(1);
    }
    return;
  }

  // Default: Build for current host operating system and place in ./bin/
  const hostRid = resolveHostRid();
  const outDir = path.join(REPO_ROOT, 'bin');
  console.log(`Detected host system: \x1b[1m${process.platform}-${process.arch}\x1b[0m -> RID: \x1b[1m${hostRid}\x1b[0m`);
  console.log(`Output directory: ${outDir}\n`);

  const success = publishRid(hostRid, outDir, true);
  if (!success) {
    process.exit(1);
  }

  const binaryName = getBinaryName(hostRid);
  console.log(`\n\x1b[32mExecutable ready at:\x1b[0m ${path.join(outDir, binaryName)}`);
  console.log(`You can run it directly: \x1b[36m./bin/${binaryName} --help\x1b[0m\n`);
}

main();
