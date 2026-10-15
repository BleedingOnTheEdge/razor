// -----------------------------------------------------------------------------
// <copyright file="paths-instances.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import type { EngineInstanceDetailPayload } from './types.js';

export interface InstancePaths {
  '/api/instances': {
    get: {
      parameters: {
        query?: { accountId?: string };
      };
      responses: {
        200: {
          content: {
            'application/json': Array<{
              instanceId: string;
              accountId: string;
              licenseId: string;
              engineId: string;
              name: string;
              status: string;
              createdAt: string;
              lastSeenAt?: string | null;
              isConnected: boolean;
              manifestExtensionCount: number;
            }>;
          };
        };
      };
    };
  };
  '/api/engines': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            accountId: string;
            licenseId: string;
            engineId?: string;
            name?: string;
          };
        };
      };
      responses: {
        201: {
          content: {
            'application/json': {
              instanceId: string;
              engineId: string;
              apiKey: string;
            };
          };
        };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/instances/{instanceId}': {
    get: {
      parameters: {
        path: { instanceId: string };
      };
      responses: {
        200: {
          content: {
            'application/json': EngineInstanceDetailPayload;
          };
        };
        404: { content: { 'application/json': unknown } };
      };
    };
    put: {
      parameters: {
        path: { instanceId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            name?: string;
            status?: string;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': { instanceId: string; name: string } } };
        404: { content: { 'application/json': unknown } };
      };
    };
    delete: {
      parameters: {
        path: { instanceId: string };
      };
      responses: {
        204: { content: { 'application/json': unknown } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/instances/{instanceId}/rotate-key': {
    post: {
      parameters: {
        path: { instanceId: string };
      };
      responses: {
        200: { content: { 'application/json': { instanceId: string; apiKey: string; rotatedAt?: string } } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/instances/{instanceId}/revoke': {
    post: {
      parameters: {
        path: { instanceId: string };
      };
      requestBody?: {
        content?: {
          'application/json'?: {
            reason?: string;
          };
        };
      };
      responses: {
        204: { content: { 'application/json': unknown } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/instances/{instanceId}/manifest': {
    get: {
      parameters: {
        path: { instanceId: string };
      };
      responses: {
        200: {
          content: {
            'application/json': Array<{ kind: string; name: string; reportedAt: string }>;
          };
        };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/instances/{instanceId}/profile/selections': {
    put: {
      parameters: {
        path: { instanceId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            instanceId?: string;
            kind: string;
            name: string;
            isActive: boolean;
          };
        };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              activeSelections: {
                adapter?: string | null;
                strategy?: string | null;
                neuralNetwork?: string | null;
                hookPlugins: string[];
              };
              activationCommandId?: string | null;
            };
          };
        };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/instances/{instanceId}/commands': {
    get: {
      parameters: {
        path: { instanceId: string };
        query?: { status?: string };
      };
      responses: {
        200: {
          content: {
            'application/json': Array<{
              commandId: string;
              instanceId: string;
              numericCommandId: number;
              commandType: string;
              correlationId: string;
              status: string;
              submittedAt: string;
              dispatchedAt?: string | null;
              completedAt?: string | null;
              errorMessage?: string | null;
            }>;
          };
        };
      };
    };
    post: {
      parameters: {
        path: { instanceId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            commandId: number;
            commandType?: string;
            parameters?: string;
            timeoutSeconds?: number;
          };
        };
      };
      responses: {
        201: {
          content: {
            'application/json': {
              commandId: string;
              correlationId: string;
              status: string;
              delivered: boolean;
            };
          };
        };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/commands/{commandId}': {
    get: {
      parameters: {
        path: { commandId: string };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              commandId: string;
              instanceId: string;
              numericCommandId: number;
              commandType: string;
              correlationId: string;
              status: string;
              submittedAt: string;
              dispatchedAt?: string | null;
              completedAt?: string | null;
              resultPayload?: unknown;
              errorMessage?: string | null;
              progressReports: Array<{ payload: unknown; reportedAt: string }>;
            };
          };
        };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
}
