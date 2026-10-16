// -----------------------------------------------------------------------------
// <copyright file="paths-admin.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import type {
  AuthSessionPayload,
  UserProfilePayload,
  ClusterSettingsPayload,
  UpdateProfileRequestPayload,
} from './types.js';

export interface AdminAndProfilePaths {
  '/api/auth/login': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            userName: string;
            password: string;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': AuthSessionPayload } };
        400: { content: { 'application/json': { message?: string } } };
        401: { content: { 'application/json': { message?: string } } };
      };
    };
  };
  '/api/auth/register': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            userName: string;
            password: string;
            accountName?: string;
            role?: 'SuperAdmin' | 'Admin' | 'Operator' | 'Developer' | 'Trader';
            subscriptionTier?: 'Free' | 'Pro' | 'Enterprise';
          };
        };
      };
      responses: {
        200: { content: { 'application/json': AuthSessionPayload } };
        400: { content: { 'application/json': { message?: string } } };
      };
    };
  };
  '/api/auth/session': {
    get: {
      responses: {
        200: { content: { 'application/json': UserProfilePayload } };
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
  '/api/profile': {
    get: {
      parameters?: {
        query?: { userId?: string; userName?: string };
      };
      responses: {
        200: { content: { 'application/json': UserProfilePayload } };
        401: { content: { 'application/json': unknown } };
      };
    };
    put: {
      requestBody: {
        content: {
          'application/json': UpdateProfileRequestPayload;
        };
      };
      responses: {
        200: { content: { 'application/json': UserProfilePayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/admin/settings': {
    get: {
      parameters?: {
        query?: {};
      };
      responses: {
        200: { content: { 'application/json': ClusterSettingsPayload } };
        403: { content: { 'application/json': unknown } };
      };
    };
    put: {
      requestBody: {
        content: {
          'application/json': Partial<ClusterSettingsPayload>;
        };
      };
      responses: {
        200: { content: { 'application/json': ClusterSettingsPayload } };
        400: { content: { 'application/json': { errors: Record<string, string[]> } } };
      };
    };
  };
  '/api/admin/settings/reset': {
    post: {
      parameters?: {
        query?: {};
      };
      responses: {
        200: { content: { 'application/json': ClusterSettingsPayload } };
      };
    };
  };
  '/api/admin/users': {
    get: {
      parameters?: {
        query?: {
          Search?: string;
          Role?: string;
        };
      };
      responses: {
        200: { content: { 'application/json': UserProfilePayload[] } };
        403: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/admin/users/{userId}/role': {
    put: {
      parameters: {
        path: { userId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            userId?: string;
            role: string;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': UserProfilePayload } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/admin/users/{userId}/status': {
    put: {
      parameters: {
        path: { userId: string };
      };
      requestBody: {
        content: {
          'application/json': {
            userId?: string;
            isActive: boolean;
          };
        };
      };
      responses: {
        200: { content: { 'application/json': { success?: boolean; isActive?: boolean } } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
  '/api/admin/users/{userId}': {
    delete: {
      parameters: {
        path: { userId: string };
      };
      requestBody?: {
        content?: {
          'application/json'?: {
            userId?: string;
          };
        };
      };
      responses: {
        204: { content: { 'application/json': unknown } };
        400: { content: { 'application/json': unknown } };
        404: { content: { 'application/json': unknown } };
      };
    };
  };
}
