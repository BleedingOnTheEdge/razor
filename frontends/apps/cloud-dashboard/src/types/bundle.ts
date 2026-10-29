// -----------------------------------------------------------------------------
// <copyright file="bundle.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

export interface BundleDnaPayload {
  id: string;
  bundleSnapshotId: string;
  dnaId: string;
  name: string;
  parametersJson: string;
  backtestStatus: 'Untested' | 'Tested' | 'Backtested';
  fitness?: number | null;
  netProfit?: number | null;
  reportSummary?: string | null;
  createdAt: string;
}

export interface BundleSnapshotPayload {
  id: string;
  bundleId: string;
  version: string;
  name: string;
  snapshotStateJson: string;
  createdAt: string;
  dnas?: BundleDnaPayload[];
}

export interface TradingBundlePayload {
  id: string;
  accountId: string;
  name: string;
  description: string;
  documentationMarkdown: string;
  isPublic: boolean;
  publishedToMarketplace: boolean;
  price: number;
  currency: 'IRT' | 'USDT' | 'USD' | 'Free';
  strategySlotId: string;
  adapterSlotIdsJson: string;
  hookSlotIdsJson: string;
  defaultConfigurationsJson: string;
  createdAt: string;
  updatedAt: string;
  snapshots?: BundleSnapshotPayload[];
}

export interface AvailableComponent {
  id: string;
  name: string;
  kind: 'Strategy' | 'Adapter' | 'Hook';
  description: string;
  version: string;
  author: string;
  category?: string;
  isOwned: boolean;
}
