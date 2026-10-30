'use client';

import React from 'react';
import { Key, Copy, X, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export interface CreatedCredentialsDialogProps {
  credentials: {
    instanceId: string;
    engineId: string;
    apiKey: string;
  } | null;
  onClose: () => void;
  userName?: string;
}

export function CreatedCredentialsDialog({
  credentials,
  onClose,
  userName = 'pro-trader',
}: CreatedCredentialsDialogProps) {
  const toast = useToast();
  if (!credentials) return null;

  const wsEndpoint = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/engine`
    : 'ws://localhost:5000/engine';
  const launchCommand = `dotnet run --project core/src/Engine -- --instance ${credentials.instanceId} --engine-id ${credentials.engineId} --key "${credentials.apiKey}" --username ${userName} --password trader123 --endpoint ${wsEndpoint}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h3 className="text-base font-semibold text-zinc-900 font-mono flex items-center gap-2">
            <Key className="w-4 h-4 text-[#3ECF8E]" />
            <span>Engine Daemon Credentials</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <p className="text-zinc-500 font-sans leading-relaxed">
            Copy the engine credentials and local launch command below. Run this command in your terminal to start the autonomous daemon.
          </p>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5">
            <div>
              <span className="text-zinc-500 block font-sans">Instance ID:</span>
              <span className="text-zinc-900 font-semibold block">{credentials.instanceId}</span>
            </div>
            <div>
              <span className="text-zinc-500 block font-sans">Engine ID:</span>
              <span className="text-zinc-900 block">{credentials.engineId}</span>
            </div>
            <div>
              <span className="text-zinc-500 block font-sans">Engine API Key:</span>
              <div className="flex items-center justify-between gap-2 mt-1 bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
                <span className="text-[#3ECF8E] font-semibold break-all">{credentials.apiKey}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.apiKey);
                    toast.success('Copied', 'API key copied to clipboard');
                  }}
                  className="shrink-0 p-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors"
                  title="Copy API key"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-zinc-500 block font-sans">CLI Launch Command:</span>
              <div className="flex items-center justify-between gap-2 mt-1 bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
                <span className="text-zinc-800 font-mono text-[11px] break-all leading-tight">
                  {launchCommand}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(launchCommand);
                    toast.success('Copied', 'Launch command copied to clipboard');
                  }}
                  className="shrink-0 p-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors"
                  title="Copy launch command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-zinc-700 font-sans">
              <span className="text-emerald-700 font-semibold font-mono flex items-center gap-1.5 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero-Broker Paper Trading Ready</span>
              </span>
              Engine defaults to <code className="text-emerald-900 font-semibold">MockPaperTradingAdapter</code>. Generates synthetic brownian motion ticks and simulates zero-dependency order execution out of the box.
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3ECF8E] hover:bg-[#34b27b] text-zinc-950 text-white rounded-lg text-xs font-mono font-medium transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
