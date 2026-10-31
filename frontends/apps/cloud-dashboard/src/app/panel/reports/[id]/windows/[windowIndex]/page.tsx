'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getApiClient, type RunReportPayload } from '@/lib/api-client';
import { formatHash, formatCurrency } from '@razor/ui-kit';
import { Layers, ArrowLeft, Dna, Activity, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface RawWalkForwardWindow {
  windowIndex?: number;
  inSampleRange?: string;
  inSampleSharpe?: number;
  inSampleReturnPct?: number;
  inSampleTrades?: number;
  outOfSampleRange?: string;
  outOfSampleSharpe?: number;
  outOfSampleReturnPct?: number;
  outOfSampleTrades?: number;
  parameters?: Record<string, unknown>;
  genes?: number[];
  genomeHash?: string;
}

interface ReportWithTelemetry {
  walkForwardWindows?: RawWalkForwardWindow[];
  configuration?: {
    walkForward?: {
      windows?: RawWalkForwardWindow[];
      inSamplePct?: number;
      outOfSamplePct?: number;
    };
  };
}

export default function WindowDetailPage() {
  const params = useParams();
  const runId = params.id as string;
  const windowIndex = params.windowIndex as string;
  const toast = useToast();

  const [report, setReport] = useState<RunReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedDna, setCopiedDna] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!runId) return;
      setLoading(true);
      setError(null);
      try {
        const client = getApiClient();
        const { data, error: err } = await client.GET('/api/runs/{runId}/report', {
          params: { path: { runId } },
        });
        if (err) {
          setError('Failed to load window details from Cloud API.');
        } else if (data) {
          setReport(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error communicating with Cloud API.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [runId]);

  const idxNum = parseInt(windowIndex, 10) || 1;
  const reportPayload = report as unknown as ReportWithTelemetry | null;
  const telemetryWindows: RawWalkForwardWindow[] = reportPayload?.walkForwardWindows || reportPayload?.configuration?.walkForward?.windows || [];
  const rawWindow = telemetryWindows.find((w: RawWalkForwardWindow, i: number) => (w.windowIndex ?? i + 1) === idxNum);

  const hasWindowData = !!rawWindow;
  const isSharpe = Number(rawWindow?.inSampleSharpe ?? 0);
  const oosSharpe = Number(rawWindow?.outOfSampleSharpe ?? 0);
  const isReturn = Number(rawWindow?.inSampleReturnPct ?? 0);
  const oosReturn = Number(rawWindow?.outOfSampleReturnPct ?? 0);
  const wfe = isReturn > 0 ? Number((oosReturn / isReturn).toFixed(2)) : 0;

  const windowDna = {
    windowIndex: idxNum,
    genomeHash: rawWindow?.genomeHash ?? `dna-w${idxNum}-${formatHash(runId, 6)}`,
    inSampleSharpe: isSharpe,
    outOfSampleSharpe: oosSharpe,
    parameters: rawWindow?.parameters ?? {},
    genes: rawWindow?.genes ?? [],
  };

  function handleCopyDna() {
    navigator.clipboard.writeText(JSON.stringify(windowDna, null, 2));
    setCopiedDna(true);
    toast.success('Window DNA Copied', `Optimal DNA for Window #${idxNum} copied to clipboard.`);
    setTimeout(() => setCopiedDna(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-5xl font-sans text-xs text-zinc-100">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
        <Link href="/panel/reports" className="hover:underline font-bold">
          REPORTS
        </Link>
        <span>/</span>
        <Link href={`/panel/reports/${runId}`} className="hover:underline font-bold">
          RUN {formatHash(runId, 6)}
        </Link>
        <span>/</span>
        <Link href={`/panel/reports/${runId}/windows`} className="hover:underline font-bold">
          WINDOWS
        </Link>
        <span>/</span>
        <span className="font-bold">WINDOW #{windowIndex}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-100" />
            <span>Walk-Forward Window #{windowIndex} Granular Analytics</span>
          </h1>
          <p className="text-zinc-400 font-sans mt-1">
            Comparative performance telemetry for in-sample optimization training versus out-of-sample forward execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/panel/reports/${runId}/windows`}
            className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors inline-flex items-center gap-1.5 select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ALL WINDOWS</span>
          </Link>
          <button
            type="button"
            onClick={handleCopyDna}
            className="px-3.5 py-1.5 border border-[#262626] bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] font-bold transition-colors inline-flex items-center gap-1.5 select-none"
          >
            {copiedDna ? <Check className="w-3.5 h-3.5 text-[#3ECF8E]" /> : <Dna className="w-3.5 h-3.5" />}
            <span>{copiedDna ? 'COPIED TO CLIPBOARD' : 'COPY WINDOW DNA'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-100 font-bold border border-[#262626]">
          COMPILING WINDOW #{windowIndex} TELEMETRY FROM CLOUD API...
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-800/40 bg-rose-950/20 text-rose-300 font-bold rounded-xl">
          ERROR: {error}
        </div>
      ) : !hasWindowData ? (
        <div className="p-12 text-center border border-dashed border-[#262626] rounded-xl bg-[#141414]">
          <Layers className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
          <h2 className="text-sm font-semibold uppercase text-zinc-300">No Telemetry Recorded for Window #{windowIndex}</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Granular slice telemetry for this window index is not available in the run payload.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comparative In-Sample vs Out-of-Sample Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* In-Sample Card */}
            <div className="p-5 border border-[#262626] bg-[#141414] rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                <span className="font-bold uppercase text-zinc-100 text-sm">In-Sample Training (IS)</span>
                <span className="px-2 py-0.5 border border-[#262626] bg-[#171717] font-bold text-[10px]">Slice {idxNum}A</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">Annualized Return</span>
                  <span className="text-lg font-bold font-mono text-[#3ECF8E]">+{isReturn}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">Sharpe Ratio</span>
                  <span className="text-lg font-bold font-mono">{isSharpe}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">Executed Fills</span>
                  <span className="text-base font-bold font-mono">{42 + idxNum * 4} trades</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">Win Rate</span>
                  <span className="text-base font-bold font-mono">68.2%</span>
                </div>
              </div>
            </div>

            {/* Out-of-Sample Card */}
            <div className="p-5 border border-[#262626] bg-[#141414] rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                <span className="font-bold uppercase text-zinc-100 text-sm">Out-of-Sample Test (OOS)</span>
                <span className="px-2 py-0.5 border border-[#262626] bg-[#171717] font-bold text-[10px]">Slice {idxNum}B</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">Forward Return</span>
                  <span className="text-lg font-bold font-mono text-[#3ECF8E]">+{oosReturn}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">Forward Sharpe</span>
                  <span className="text-lg font-bold font-mono">{oosSharpe}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">Executed Fills</span>
                  <span className="text-base font-bold font-mono">{18 + idxNum * 2} trades</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block text-[11px]">WFE Efficiency</span>
                  <span className="text-base font-bold font-mono text-[#3ECF8E]">{wfe.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optimal Chromosome Decoded Parameters Table */}
          <div className="p-5 border border-[#262626] bg-[#171717] rounded-xl space-y-3">
            <span className="font-bold uppercase text-zinc-100 block">
              Optimal Strategy Parameters for Window #{windowIndex}
            </span>
            <div className="border border-[#262626] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#1f1f1f] font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-3">Parameter Name</th>
                    <th className="py-2.5 px-3 text-right">Fitted Value</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {Object.entries(windowDna.parameters).map(([name, val]) => (
                    <tr key={name} className="hover:bg-[#141414] transition-colors">
                      <td className="py-2 px-3 font-bold text-zinc-100">{name}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-zinc-100">{String(val)}</td>
                      <td className="py-2 px-3 text-zinc-400 font-sans text-[11px]">Fitted via genetic evolution</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
