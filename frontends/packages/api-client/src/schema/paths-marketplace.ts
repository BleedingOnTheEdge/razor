// -----------------------------------------------------------------------------
// <copyright file="paths-marketplace.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import type { MarketplaceItemPayload } from './types.js';

export interface MarketplacePaths {
  '/api/marketplace/items': {
    get: {
      parameters?: {
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
  '/api/marketplace/acquisitions': {
    get: {
      parameters?: {
        query?: { accountId?: string };
      };
      responses: {
        200: {
          content: {
            'application/json': Array<{
              id: string;
              itemId: string;
              itemName?: string;
              licenseKey: string;
              acquiredAt: string;
            }>;
          };
        };
      };
    };
  };
}
