// -----------------------------------------------------------------------------
// <copyright file="paths.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import type { InstancePaths } from './paths-instances.js';
import type { RunPaths } from './paths-runs.js';
import type { MarketplacePaths } from './paths-marketplace.js';
import type { AdminAndProfilePaths } from './paths-admin.js';
import type { TicketAndCommunityPaths } from './paths-tickets.js';
import type { BundlePaths } from './paths-bundles.js';

export type * from './paths-instances.js';
export type * from './paths-runs.js';
export type * from './paths-marketplace.js';
export type * from './paths-admin.js';
export type * from './paths-tickets.js';
export type * from './paths-bundles.js';

/**
 * Paths and operations matching the Razor Cloud Control Plane OpenAPI specification.
 * Aggregates all modular route subsets into a single strongly-typed contract interface.
 */
export interface RazorPaths
  extends InstancePaths,
    RunPaths,
    MarketplacePaths,
    AdminAndProfilePaths,
    TicketAndCommunityPaths,
    BundlePaths {}
