// -----------------------------------------------------------------------------
// <copyright file="paths-runs.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import type {
  FlowRunPayload,
  LineageNodePayload,
  RunReportPayload,
  RankedRunResultPayload,
} from './types.js';

export interface RunPaths {
  '/api/runs': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            instanceId: string;
            kind: string;
            baseSeed?: number;
          };
        };
      };
      responses: {
        201: { content: { 'application/json': FlowRunPayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/instances/{instanceId}/runs': {
    get: {
      parameters: {
        path: { instanceId: string };
      };
      responses: {
        200: { content: { 'application/json': FlowRunPayload[] } };
      };
    };
  };
  '/api/runs/{runId}': {
    get: {
      parameters: {
        path: { runId: string };
      };
      responses: {
        200: { content: { 'application/json': FlowRunPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/runs/{runId}/pause': {
    post: {
      parameters: {
        path: { runId: string };
      };
      responses: {
        200: { content: { 'application/json': FlowRunPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/runs/{runId}/complete': {
    post: {
      parameters: {
        path: { runId: string };
      };
      requestBody?: {
        content: {
          'application/json': {
            netProfit?: number;
            totalReturn?: number;
            sharpeRatio?: number;
            maxDrawdown?: number;
            tradeCount?: number;
            bestFitness?: number;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': FlowRunPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/runs/{runId}/branch': {
    post: {
      parameters: {
        path: { runId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            forkPoint: { stepIndex?: number; generation?: number; windowIndex?: number };
            intervention: {
              stepIndex: number;
              previousFingerprint: string;
              newFingerprint: string;
              actor: string;
              reason: string;
              modificationsSummary?: string;
              beforePayloadJson?: string;
              afterPayloadJson?: string;
            };
            newRandomPosition?: string;
            childSeed?: number;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': FlowRunPayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/runs/{runId}/resume': {
    post: {
      parameters: {
        path: { runId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            forkPoint: { stepIndex?: number; generation?: number; windowIndex?: number };
            intervention: {
              stepIndex: number;
              previousFingerprint: string;
              newFingerprint: string;
              actor: string;
              reason: string;
              modificationsSummary?: string;
              beforePayloadJson?: string;
              afterPayloadJson?: string;
            };
            newRandomPosition?: string;
            childSeed?: number;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': FlowRunPayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/runs/{runId}/lineage': {
    get: {
      parameters: {
        path: { runId: string };
      };
      responses: {
        200: { content: { 'application/json': LineageNodePayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/runs/{runId}/report': {
    get: {
      parameters: {
        path: { runId: string };
      };
      responses: {
        200: { content: { 'application/json': RunReportPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/instances/{instanceId}/runs/ranking': {
    get: {
      parameters: {
        path: { instanceId: string };
        query?: { metric?: string; includeDiverged?: boolean };
      };
      responses: {
        200: { content: { 'application/json': RankedRunResultPayload[] } };
      };
    };
  };
}
