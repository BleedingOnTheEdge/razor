// -----------------------------------------------------------------------------
// <copyright file="types.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

export interface EngineInstanceDetailPayload {
  instanceId: string;
  accountId: string;
  licenseId: string;
  engineId: string;
  name: string;
  status: string;
  isConnected?: boolean;
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
}

export interface WinningDnaPayload {
  genomeHash?: string;
  generation?: number;
  genes: number[];
  parameters: Record<string, number>;
  slots?: {
    strategy?: string | null;
    adapter?: string | null;
    neuralNetwork?: string | null;
  } | null;
  execution?: {
    symbols?: string[] | null;
    timeframes?: string[] | null;
    initialBalance?: number;
    leverage?: number;
    accountCurrency?: string | null;
  } | null;
  fitness: number;
}

export interface DetailedMetricsPayload {
  grossProfit?: number;
  grossLoss?: number;
  profitFactor?: number;
  winRate?: number;
  lossRate?: number;
  winningTrades?: number;
  losingTrades?: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  expectancy?: number;
  payoffRatio?: number;
  winLossRatio?: number;
  averageWin?: number;
  averageLoss?: number;
  largestWin?: number;
  largestLoss?: number;
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
  averageHoldingPeriodSeconds?: number;
  maxDrawdownPct?: number;
  maxDrawdownAmount?: number;
}

export interface TradeItemPayload {
  ticket: number;
  symbol: string;
  side: string;
  volume: number;
  openTime: string;
  openPrice: number;
  closeTime?: string | null;
  closePrice: number;
  profit: number;
  returnPct: number;
  commission?: number;
  swap?: number;
  stopLoss?: number;
  takeProfit?: number;
  exitReason?: string;
  slippageTicks?: number;
  executionVenue?: string;
}

export interface EquityPointPayload {
  timestamp: string;
  equity: number;
  balance: number;
  drawdownPct: number;
}

export interface PopulationIndividualPayload {
  id: string;
  individualIndex: number;
  fitness: number;
  diversity: number;
  genes: number[];
  parameters: Record<string, any>;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  tradeCount: number;
  trades?: TradeItemPayload[];
  equityCurve?: EquityPointPayload[];
  dna?: WinningDnaPayload;
}

export interface GenerationProgressPayload {
  generation: number;
  bestFitness: number;
  averageFitness: number;
  diversity?: number;
  populationDiversity?: number;
  isHyperMutation?: boolean;
  populations?: PopulationIndividualPayload[];
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
  completedAt?: string | null;
  configurationJson?: string | null;
  winningDnaJson?: string | null;
  winningDna?: WinningDnaPayload | null;
  resultPayloadJson?: string | null;
  metrics?: RunMetricsPayload | null;
  interventionsCount: number;
  gapsCount: number;
}

export interface RunMetricsPayload {
  netProfit?: number | null;
  totalReturn?: number | null;
  sharpeRatio?: number | null;
  maxDrawdown?: number | null;
  tradeCount?: number | null;
  bestFitness?: number | null;
}

export interface LineageNodePayload {
  runId: string;
  parentRunId?: string | null;
  kind: string;
  status: string;
  relation?: string | null;
  continuity?: string | null;
  forkPoint?: { step?: number; generation?: number; windowIndex?: number } | null;
  forkPointStep?: number | null;
  interventionsCount?: number;
  engineInstanceId?: string;
  createdAt?: string;
  metrics?: RunMetricsPayload | null;
  baseSeed?: number | null;
  randomPosition?: string | null;
  isPartial?: boolean;
  interventions?: Array<{
    stepIndex: number;
    previousFingerprint: string;
    newFingerprint: string;
    actor: string;
    reason: string;
    modificationsSummary?: string | null;
    beforePayloadJson?: string | null;
    afterPayloadJson?: string | null;
  }>;
  gaps?: Array<{
    startStep: number;
    endStep: number;
    reason: string;
  }>;
  children: LineageNodePayload[];
  run?: FlowRunPayload;
}

export interface RunReportPayload {
  runId: string;
  engineInstanceId: string;
  kind: string;
  status: string;
  parentRunId?: string | null;
  relation?: string | null;
  continuity?: string | null;
  baseSeed?: number | null;
  createdAt: string;
  completedAt?: string | null;
  configurationJson?: string | null;
  isPartial: boolean;
  headlineFiguresSuppressed: boolean;
  isDiverged: boolean;
  isComparable: boolean;
  divergenceFlag?: string | null;
  warningMessage?: string | null;
  aggregates?: {
    netProfit?: number | null;
    totalReturn?: number | null;
    sharpeRatio?: number | null;
    maxDrawdown?: number | null;
    tradeCount?: number | null;
    bestFitness?: number | null;
  } | null;
  metrics?: {
    netProfit?: number | null;
    totalReturn?: number | null;
    sharpeRatio?: number | null;
    maxDrawdown?: number | null;
    tradeCount?: number | null;
    bestFitness?: number | null;
  } | null;
  interventions: Array<{
    id?: string;
    stepIndex: number;
    previousFingerprint: string;
    newFingerprint: string;
    actor: string;
    reason: string;
    modificationsSummary?: string | null;
    timestamp?: string;
  }>;
  gaps: Array<{
    id?: string;
    startStep: number;
    endStep: number;
    reason: string;
    recordedAt?: string;
  }>;
  comparable?: boolean;
  winningDna?: WinningDnaPayload | null;
  detailedMetrics?: DetailedMetricsPayload | null;
  trades?: TradeItemPayload[] | null;
  equityCurve?: EquityPointPayload[] | null;
  generationProgress?: GenerationProgressPayload[] | null;
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

export interface AuthSessionPayload {
  token: string;
  user: UserProfilePayload;
}

export interface UserProfilePayload {
  userId: string;
  accountId: string;
  userName: string;
  accountName: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role: 'SuperAdmin' | 'Admin' | 'Operator' | 'Developer' | 'Trader';
  isActive?: boolean;
  subscriptionTier: 'Free' | 'Pro' | 'Enterprise';
  maxInstances: number;
  canManageFleet: boolean;
  canExecuteLive: boolean;
  canPublishMarketplace: boolean;
  canAdministerCluster?: boolean;
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

export interface ClusterSettingsPayload {
  heartbeatIntervalSeconds: number;
  heartbeatTimeoutSeconds: number;
  maxFleetSizePerAccount: number;
  commandQueueExpirySeconds: number;
  autoDrainGracePeriodSeconds: number;
  enforceStrictKeyRotationDays: number;
  requireMfaForLiveTrading: boolean;
  allowSelfRegistration: boolean;
  allowedIpRanges: string;
  sessionTimeoutMinutes: number;
  requireCurationApproval: boolean;
  platformFeePercent: number;
  allowUnverifiedAuthors: boolean;
  metricsRetentionDays: number;
  auditLogRetentionDays: number;
  detailedBehaviorLogging: boolean;
}

export interface UpdateProfileRequestPayload {
  userId?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
}
