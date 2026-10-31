// -----------------------------------------------------------------------------
// <copyright file="paths-bundles.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

export interface TradingBundlePayload {
  id: string;
  accountId: string;
  name: string;
  description: string;
  documentationMarkdown: string;
  isPublic: boolean;
  publishedToMarketplace: boolean;
  price: number;
  currency: string;
  strategySlotId: string;
  adapterSlotIdsJson: string;
  hookSlotIdsJson: string;
  defaultConfigurationsJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface BundleSnapshotPayload {
  id: string;
  bundleId: string;
  version: string;
  name: string;
  snapshotStateJson: string;
  createdAt: string;
}

export interface BundleDnaPayload {
  id: string;
  bundleSnapshotId: string;
  dnaId: string;
  name: string;
  parametersJson: string;
  backtestStatus: string;
  fitness?: number | null;
  netProfit?: number | null;
  reportSummary?: string | null;
  createdAt: string;
}

export interface BundlePaths {
  '/api/bundles': {
    get: {
      parameters?: {
        query?: { accountId?: string; isPublic?: boolean; search?: string };
      };
      responses: {
        200: { content: { 'application/json': TradingBundlePayload[] } };
      };
    };
    post: {
      requestBody: {
        content: {
          'application/json': Partial<TradingBundlePayload> & { name: string; accountId: string };
        };
      };
      responses: {
        200: { content: { 'application/json': TradingBundlePayload } };
        201: { content: { 'application/json': TradingBundlePayload } };
      };
    };
  };
  '/api/bundles/{id}': {
    get: {
      parameters: {
        path: { id: string };
      };
      responses: {
        200: { content: { 'application/json': TradingBundlePayload } };
        404: { content: { 'application/json': { message: string } } };
      };
    };
  };
  '/api/bundles/{id}/publish': {
    post: {
      parameters: {
        path: { id: string };
      };
      responses: {
        200: { content: { 'application/json': { success: boolean } } };
      };
    };
  };
  '/api/bundles/{id}/snapshots': {
    get: {
      parameters: {
        path: { id: string };
      };
      responses: {
        200: { content: { 'application/json': BundleSnapshotPayload[] } };
      };
    };
    post: {
      parameters: {
        path: { id: string };
      };
      requestBody: {
        content: {
          'application/json': { version: string; name: string; snapshotStateJson: string };
        };
      };
      responses: {
        201: { content: { 'application/json': BundleSnapshotPayload } };
      };
    };
  };
}
