'use client';

import React from 'react';
import type {
  EngineInstancePayload,
  RunReportPayload,
  GenerationProgressPayload,
  PopulationIndividualPayload,
  TradeItemPayload,
  WinningDnaPayload,
} from '@/lib/api-client';
import { CompleteRunModal } from './CompleteRunModal';
import { LaunchRunModal } from '@/components/runs/LaunchRunModal';
import { GenerationDetailModal } from '@/components/optimization/GenerationDetailModal';
import { PopulationBacktestModal } from '@/components/optimization/PopulationBacktestModal';
import { GranularTradeDetailModal } from '@/components/trades/GranularTradeDetailModal';

export interface ReportModalsProps {
  runId: string;
  report: RunReportPayload | null;
  instances: EngineInstancePayload[];
  completeModalOpen: boolean;
  setCompleteModalOpen: (val: boolean) => void;
  launchModalOpen: boolean;
  setLaunchModalOpen: (val: boolean) => void;
  launchInstanceId: string;
  setLaunchInstanceId: (val: string) => void;
  launchKind: 'Backtest' | 'Optimization' | 'WalkForward' | 'Live';
  setLaunchKind: (val: 'Backtest' | 'Optimization' | 'WalkForward' | 'Live') => void;
  injectedDna: WinningDnaPayload | null;
  setInjectedDna: (val: WinningDnaPayload | null) => void;
  selectedGeneration: GenerationProgressPayload | null;
  setSelectedGeneration: (val: GenerationProgressPayload | null) => void;
  selectedPopulation: PopulationIndividualPayload | null;
  setSelectedPopulation: (val: PopulationIndividualPayload | null) => void;
  selectedTrade: TradeItemPayload | null;
  setSelectedTrade: (val: TradeItemPayload | null) => void;
  netProfit: string;
  setNetProfit: (val: string) => void;
  totalReturn: string;
  setTotalReturn: (val: string) => void;
  sharpeRatio: string;
  setSharpeRatio: (val: string) => void;
  maxDrawdown: string;
  setMaxDrawdown: (val: string) => void;
  tradeCount: string;
  setTradeCount: (val: string) => void;
  bestFitness: string;
  setBestFitness: (val: string) => void;
  submittingComplete: boolean;
  handleCompleteSubmit: (e: React.FormEvent) => Promise<void>;
}

export function ReportModals({
  runId,
  report,
  instances,
  completeModalOpen,
  setCompleteModalOpen,
  launchModalOpen,
  setLaunchModalOpen,
  launchInstanceId,
  setLaunchInstanceId,
  launchKind,
  setLaunchKind,
  injectedDna,
  setInjectedDna,
  selectedGeneration,
  setSelectedGeneration,
  selectedPopulation,
  setSelectedPopulation,
  selectedTrade,
  setSelectedTrade,
  netProfit,
  setNetProfit,
  totalReturn,
  setTotalReturn,
  sharpeRatio,
  setSharpeRatio,
  maxDrawdown,
  setMaxDrawdown,
  tradeCount,
  setTradeCount,
  bestFitness,
  setBestFitness,
  submittingComplete,
  handleCompleteSubmit,
}: ReportModalsProps) {
  return (
    <>
      <CompleteRunModal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        netProfit={netProfit}
        setNetProfit={setNetProfit}
        totalReturn={totalReturn}
        setTotalReturn={setTotalReturn}
        sharpeRatio={sharpeRatio}
        setSharpeRatio={setSharpeRatio}
        maxDrawdown={maxDrawdown}
        setMaxDrawdown={setMaxDrawdown}
        tradeCount={tradeCount}
        setTradeCount={setTradeCount}
        bestFitness={bestFitness}
        setBestFitness={setBestFitness}
        submittingComplete={submittingComplete}
        onSubmit={handleCompleteSubmit}
      />

      <LaunchRunModal
        isOpen={launchModalOpen}
        onClose={() => {
          setLaunchModalOpen(false);
          setInjectedDna(null);
        }}
        instances={instances}
        launchInstanceId={launchInstanceId}
        setLaunchInstanceId={setLaunchInstanceId}
        launchKind={launchKind}
        setLaunchKind={setLaunchKind}
        initialDna={injectedDna || report?.winningDna || undefined}
        onRunLaunched={(newRun) => {
          if (typeof window !== 'undefined') {
            window.location.assign(`/panel/runs/${newRun.id}`);
          }
        }}
      />

      <GenerationDetailModal
        isOpen={!!selectedGeneration}
        onClose={() => setSelectedGeneration(null)}
        generation={selectedGeneration}
        runId={runId}
        onSelectIndividual={(individual) => {
          setSelectedPopulation(individual);
        }}
      />

      <PopulationBacktestModal
        isOpen={!!selectedPopulation}
        onClose={() => setSelectedPopulation(null)}
        individual={selectedPopulation}
        generationNumber={selectedGeneration?.generation ?? 1}
        runId={runId}
        onSelectTrade={(trade) => {
          setSelectedTrade(trade);
        }}
        onRunAsBacktest={(individual) => {
          const constructedDna: WinningDnaPayload = individual.dna || {
            genes: individual.genes || [],
            parameters: individual.parameters || {},
            fitness: individual.fitness || 0,
            slots: report?.winningDna?.slots || null,
            execution: report?.winningDna?.execution || null,
          };
          setInjectedDna(constructedDna);
          setLaunchKind('Backtest');
          setLaunchModalOpen(true);
        }}
      />

      <GranularTradeDetailModal
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        trade={selectedTrade}
        runId={runId}
      />
    </>
  );
}
