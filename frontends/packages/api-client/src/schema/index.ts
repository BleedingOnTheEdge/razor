// -----------------------------------------------------------------------------
// <copyright file="index.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

export * from './types.js';
export * from './paths.js';

export type EngineInstancePayload = import('./paths.js').RazorPaths['/api/instances']['get']['responses'][200]['content']['application/json'][number];
