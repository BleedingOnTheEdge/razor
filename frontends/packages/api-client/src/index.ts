// -----------------------------------------------------------------------------
// <copyright file="index.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import createClient from 'openapi-fetch';
import type { RazorPaths } from './schema/paths';

export * from './schema';

export interface RazorClientConfig {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

/**
 * Creates a type-safe client for the Razor Cloud REST API.
 */
export function createRazorClient(config: RazorClientConfig) {
  const headers: Record<string, string> = { ...config.headers };
  if (config.apiKey) {
    headers['X-Cloud-Management-Key'] = config.apiKey;
  }

  return createClient<RazorPaths>({
    baseUrl: config.baseUrl,
    headers,
    fetch: config.fetch,
  });
}

export type RazorClient = ReturnType<typeof createRazorClient>;
