// -----------------------------------------------------------------------------
// <copyright file="index.ts" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

/** Administrative status of a registered Engine instance. */
export type EngineInstanceStatus =
  | 'Pending'
  | 'Active'
  | 'Draining'
  | 'Decommissioned';

/** Slot an extension occupies in the Engine and Marketplace. */
export type ExtensionKind =
  | 'Adapter'
  | 'Strategy'
  | 'Indicator'
  | 'NeuralNetwork'
  | 'HookPlugin';

/** Delivery and execution state of a queued command. */
export type CommandStatus =
  | 'Queued'
  | 'Dispatched'
  | 'Delivered'
  | 'Completed'
  | 'Failed'
  | 'TimedOut';

/** Category of flow run execution. */
export type RunKind =
  | 'Backtest'
  | 'Optimization'
  | 'WalkForward';

/** Active execution state of a flow run. */
export type RunStatus =
  | 'Pending'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

/** How a child run relates to its parent along the relation axis (003-040). */
export type RunRelation =
  | 'Original'
  | 'Appended'
  | 'Branched'
  | 'Spliced';

/** Continuity state of run execution (003-040). */
export type RunContinuity =
  | 'Contiguous'
  | 'Gapped';

/** Metrics available for ranking runs. */
export type RankingMetric =
  | 'NetProfit'
  | 'SharpeRatio'
  | 'TotalReturn'
  | 'MaxDrawdown'
  | 'Fitness';

/** Real-time domain event broadcast over Server-Sent Events (SSE). */
export interface ClientEvent<T = unknown> {
  eventType: string;
  instanceId: string | null;
  runId: string | null;
  correlationId: string | null;
  timestamp: string;
  data: T;
}

/** Execution checkpoint location where a branch or intervention occurs. */
export interface ForkPoint {
  stepIndex?: number;
  generation?: number;
  windowIndex?: number;
}

/** Specification for an append-only human or system intervention at a checkpoint. */
export interface InterventionSpecification {
  stepIndex: number;
  previousFingerprint: string;
  newFingerprint: string;
  actor: string;
  reason: string;
  modificationsSummary?: string;
  beforePayloadJson?: string;
  afterPayloadJson?: string;
}

/** Specification of an execution or coverage gap recorded for a run. */
export interface GapSpecification {
  startStep: number;
  endStep: number;
  reason: string;
}

/** Final aggregate metrics recorded upon run completion. */
export interface ReportAggregateMetrics {
  netProfit?: number;
  totalReturn?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  tradeCount?: number;
  bestFitness?: number;
}
