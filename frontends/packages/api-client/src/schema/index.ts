// -----------------------------------------------------------------------------
// <copyright file="index.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

export * from './types';
export * from './paths';

export type EngineInstancePayload = import('./paths').RazorPaths['/api/instances']['get']['responses'][200]['content']['application/json'][number];
