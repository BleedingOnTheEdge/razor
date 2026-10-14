#!/usr/bin/env node
// -----------------------------------------------------------------------------
// <copyright file="test-all.mjs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

/**
 * Runs a single test suite and tracks execution status and duration.
 */
function runSuite(name, command, args, cwd) {
  console.log(`\n${CYAN}${BOLD}▶ Running ${name}...${RESET}`);
  const start = Date.now();

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  const success = result.status === 0;

  if (success) {
    console.log(`${GREEN}${BOLD}✔ ${name} completed successfully (${duration}s)${RESET}`);
  } else {
    console.error(`${RED}${BOLD}✖ ${name} failed with exit code ${result.status} (${duration}s)${RESET}`);
  }

  return { name, success, duration, exitCode: result.status };
}

/**
 * Main test orchestrator routine.
 */
function main() {
  const args = process.argv.slice(2);
  const backendOnly = args.includes('--backend') || args.includes('-b');
  const frontendOnly = args.includes('--frontend') || args.includes('-f');

  console.log(`${BOLD}============================================================${RESET}`);
  console.log(`${BOLD}            Razor Monorepo Full Test Orchestrator           ${RESET}`);
  console.log(`${BOLD}============================================================${RESET}`);

  const results = [];

  // 1. Backend Test Suite (.NET 10 Solution)
  if (!frontendOnly) {
    const slnPath = path.join('core', 'Razor.sln');
    const backendResult = runSuite(
      'Backend Tests (dotnet test core/Razor.sln)',
      'dotnet',
      ['test', slnPath, '-c', 'Release', '--verbosity', 'minimal'],
      REPO_ROOT
    );
    results.push(backendResult);
  }

  // 2. Frontend Test Suites (Nx / Vitest)
  if (!backendOnly) {
    const frontendResult = runSuite(
      'Frontend Tests (nx run-many -t test)',
      'pnpm',
      ['nx', 'run-many', '-t', 'test', '--projects=cloud-dashboard,marketplace,contracts,api-client,ui-kit'],
      REPO_ROOT
    );
    results.push(frontendResult);
  }

  // Summary Scorecard
  console.log(`\n${BOLD}============================================================${RESET}`);
  console.log(`${BOLD}                     TEST SUMMARY SCORECARD                 ${RESET}`);
  console.log(`${BOLD}============================================================${RESET}`);

  let allPassed = true;
  for (const r of results) {
    const badge = r.success ? `${GREEN}${BOLD}[PASS]${RESET}` : `${RED}${BOLD}[FAIL]${RESET}`;
    const time = `${DIM}(${r.duration}s)${RESET}`;
    console.log(`  ${badge} ${r.name.padEnd(46)} ${time}`);
    if (!r.success) allPassed = false;
  }

  console.log(`${BOLD}------------------------------------------------------------${RESET}`);
  if (allPassed) {
    console.log(`  ${GREEN}${BOLD}ALL TEST SUITES PASSED! 100% GREEN.${RESET}`);
    console.log(`${BOLD}============================================================${RESET}\n`);
    process.exit(0);
  } else {
    console.error(`  ${RED}${BOLD}TEST FAILURES DETECTED!${RESET}`);
    console.log(`${BOLD}============================================================${RESET}\n`);
    process.exit(1);
  }
}

main();
