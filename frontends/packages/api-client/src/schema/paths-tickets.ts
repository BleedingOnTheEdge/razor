// -----------------------------------------------------------------------------
// <copyright file="paths-tickets.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import type {
  TicketPayload,
  TicketMessagePayload,
  CommunityThreadPayload,
  CommunityReplyPayload,
} from './types.js';

export interface TicketAndCommunityPaths {
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
            accountId?: string;
            userId?: string;
            authorName: string;
            targetType: 'SystemManager' | 'AdditiveDeveloper';
            targetItemId?: string;
            title: string;
            description: string;
            category?: 'Bug' | 'FeatureRequest' | 'Billing' | 'Incident' | 'General';
            priority?: 'Low' | 'Medium' | 'High' | 'Critical';
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
