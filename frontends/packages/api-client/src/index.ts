// -----------------------------------------------------------------------------
// <copyright file="index.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import createClient, { type ClientOptions } from 'openapi-fetch';

/** Paths and operations matching the Razor Cloud Control Plane OpenAPI specification. */
export interface RazorPaths {
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
            'application/json': {
              instanceId: string;
              accountId: string;
              licenseId: string;
              engineId: string;
              name: string;
              status: string;
              createdAt: string;
              lastSeenAt?: string | null;
              activeSelections: {
                adapter?: string | null;
                strategy?: string | null;
                neuralNetwork?: string | null;
                hookPlugins: string[];
              };
              selections: Array<{ kind: string; name: string; isActive: boolean }>;
              manifest: Array<{ kind: string; name: string; reportedAt: string }>;
            };
          };
        };
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
  '/api/marketplace/items': {
    get: {
      parameters: {
        query?: { kind?: string; query?: string; isCurated?: boolean };
      };
      responses: {
        200: { content: { 'application/json': MarketplaceItemPayload[] } };
      };
    };
    post: {
      requestBody: {
        content: {
          'application/json': {
            name: string;
            kind: string;
            version?: string;
            author: string;
            description?: string;
            price?: number;
            sdkVersion?: string;
            isCurated?: boolean;
          };
        };
      };
      responses: {
        201: { content: { 'application/json': MarketplaceItemPayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/marketplace/items/{itemId}': {
    get: {
      parameters: {
        path: { itemId: string };
      };
      responses: {
        200: { content: { 'application/json': MarketplaceItemPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/marketplace/items/{itemId}/reviews': {
    post: {
      parameters: {
        path: { itemId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            author: string;
            rating: number;
            comment?: string;
          };
        };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              itemId: string;
              newRating: number;
              message: string;
            };
          };
        };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/marketplace/items/{itemId}/acquire': {
    post: {
      parameters: {
        path: { itemId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            accountId: string;
            targetInstanceId?: string;
          };
        };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              id: string;
              itemId: string;
              accountId: string;
              licenseKey: string;
              acquiredAt: string;
            };
          };
        };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/users/me': {
    get: {
      parameters?: {
        query?: { userName?: string };
      };
      responses: {
        200: { content: { 'application/json': UserProfilePayload } };
      };
    };
  };
  '/api/accounts/{accountId}/subscription': {
    post: {
      parameters: {
        path: { accountId: string };
      };
      requestBody: {
        content: {
          'application/json': { tier: 'Free' | 'Pro' | 'Enterprise' };
        };
      };
      responses: {
        200: { content: { 'application/json': UserProfilePayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/tickets': {
    get: {
      parameters?: {
        query?: {
          targetType?: 'SystemManager' | 'AdditiveDeveloper';
          status?: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
          targetItemId?: string;
          accountId?: string;
        };
      };
      responses: {
        200: { content: { 'application/json': TicketPayload[] } };
      };
    };
    post: {
      requestBody: {
        content: {
          'application/json': {
            accountId: string;
            userId: string;
            authorName: string;
            targetType: 'SystemManager' | 'AdditiveDeveloper';
            targetItemId?: string;
            targetItemName?: string;
            title: string;
            description: string;
            category: 'Bug' | 'FeatureRequest' | 'Billing' | 'Incident' | 'General';
            priority: 'Low' | 'Medium' | 'High' | 'Critical';
          };
        };
      };
      responses: {
        201: { content: { 'application/json': TicketPayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/tickets/{ticketId}': {
    get: {
      parameters: {
        path: { ticketId: string };
      };
      responses: {
        200: { content: { 'application/json': TicketPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/tickets/{ticketId}/messages': {
    post: {
      parameters: {
        path: { ticketId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            authorName: string;
            authorRole?: string;
            message: string;
            newStatus?: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
          };
        };
      };
      responses: {
        200: { content: { 'application/json': TicketMessagePayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/tickets/{ticketId}/status': {
    patch: {
      parameters: {
        path: { ticketId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
          };
        };
      };
      responses: {
        204: { content: { 'application/json': unknown } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/community/threads': {
    get: {
      parameters?: {
        query?: { category?: string };
      };
      responses: {
        200: { content: { 'application/json': CommunityThreadPayload[] } };
      };
    };
    post: {
      requestBody: {
        content: {
          'application/json': {
            title: string;
            category?: string;
            authorName: string;
            authorBadge?: string;
            content: string;
          };
        };
      };
      responses: {
        201: { content: { 'application/json': CommunityThreadPayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/community/threads/{threadId}': {
    get: {
      parameters: {
        path: { threadId: string };
      };
      responses: {
        200: { content: { 'application/json': CommunityThreadPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/community/threads/{threadId}/replies': {
    post: {
      parameters: {
        path: { threadId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            authorName: string;
            authorBadge?: string;
            content: string;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': CommunityReplyPayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/community/threads/{threadId}/upvote': {
    post: {
      parameters: {
        path: { threadId: string };
      };
      responses: {
        200: { content: { 'application/json': { upvotes: number } } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
}

export interface FlowRunPayload {
  id: string;
  engineInstanceId: string;
  kind: string;
  status: string;
  parentRunId?: string | null;
  relation?: string | null;
  continuity?: string | null;
  forkPointStep?: number | null;
  forkPointGeneration?: number | null;
  forkPointWindowIndex?: number | null;
  baseSeed?: number | null;
  randomPosition?: string | null;
  isPartial: boolean;
  createdAt: string;
  metrics?: {
    netProfit?: number | null;
    totalReturn?: number | null;
    sharpeRatio?: number | null;
    maxDrawdown?: number | null;
    tradeCount?: number | null;
    bestFitness?: number | null;
  } | null;
  interventionsCount: number;
  gapsCount: number;
}

export interface LineageNodePayload {
  run: FlowRunPayload;
  children: LineageNodePayload[];
}

export interface RunReportPayload {
  runId: string;
  engineInstanceId: string;
  kind: string;
  status: string;
  relation?: string | null;
  continuity?: string | null;
  baseSeed?: number | null;
  isPartial: boolean;
  createdAt: string;
  metrics?: {
    netProfit?: number | null;
    totalReturn?: number | null;
    sharpeRatio?: number | null;
    maxDrawdown?: number | null;
    tradeCount?: number | null;
    bestFitness?: number | null;
  } | null;
  interventions: Array<{
    id: string;
    stepIndex: number;
    previousFingerprint: string;
    newFingerprint: string;
    actor: string;
    reason: string;
    modificationsSummary?: string | null;
    timestamp: string;
  }>;
  gaps: Array<{
    id: string;
    startStep: number;
    endStep: number;
    reason: string;
    recordedAt: string;
  }>;
  comparable: boolean;
}

export interface RankedRunResultPayload {
  rank: number;
  runId: string;
  score: number;
  metric: string;
  relation?: string | null;
  continuity?: string | null;
  isDiverged: boolean;
  divergenceReason?: string | null;
  comparable: boolean;
}

export type EngineInstancePayload = RazorPaths['/api/instances']['get']['responses'][200]['content']['application/json'][number];

export interface MarketplaceItemPayload {
  id: string;
  name: string;
  kind: string;
  version: string;
  author: string;
  description: string;
  price: number;
  sdkVersion: string;
  isCurated: boolean;
  downloads?: number;
  downloadsCount: number;
  rating?: number;
  createdAt: string;
  tags?: string[];
  permissions?: string[];
  readmeMarkdown?: string;
  changelog?: Array<{ version: string; date: string; changes: string[] }>;
}

export interface RazorClientConfig {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof fetch;
}

/**
 * Creates a type-safe client for the Razor Cloud REST API.
 */
export function createRazorClient(config: RazorClientConfig) {
  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['X-Cloud-Management-Key'] = config.apiKey;
  }

  return createClient<RazorPaths>({
    baseUrl: config.baseUrl,
    headers,
    fetch: config.fetch,
  });
}

export interface UserProfilePayload {
  userId: string;
  accountId: string;
  userName: string;
  accountName: string;
  role: 'Admin' | 'Operator' | 'Developer' | 'Trader';
  subscriptionTier: 'Free' | 'Pro' | 'Enterprise';
  maxInstances: number;
  canManageFleet: boolean;
  canExecuteLive: boolean;
  canPublishMarketplace: boolean;
  createdAt: string;
}

export interface TicketMessagePayload {
  id: string;
  ticketId: string;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: string;
}

export interface TicketPayload {
  id: string;
  accountId: string;
  userId: string;
  authorName: string;
  targetType: 'SystemManager' | 'AdditiveDeveloper';
  targetItemId?: string | null;
  targetItemName?: string | null;
  title: string;
  description: string;
  category: 'Bug' | 'FeatureRequest' | 'Billing' | 'Incident' | 'General';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessagePayload[];
}

export interface CommunityReplyPayload {
  id: string;
  threadId: string;
  authorName: string;
  authorBadge: string;
  content: string;
  upvotes: number;
  createdAt: string;
}

export interface CommunityThreadPayload {
  id: string;
  title: string;
  category: string;
  authorName: string;
  authorBadge: string;
  content: string;
  upvotes: number;
  repliesCount: number;
  createdAt: string;
  replies: CommunityReplyPayload[];
}

export type RazorClient = ReturnType<typeof createRazorClient>;
