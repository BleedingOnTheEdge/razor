'use client';

import React from 'react';
import { Key, Copy } from 'lucide-react';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <span>Engine Credentials Issued</span>
          </h3>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <p className="text-emerald-300 font-sans">
            Engine successfully registered with the Cloud Control Plane. Copy the generated API key below to configure the engine daemon.
          </p>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
            <div>
              <span className="text-zinc-500 block">Instance ID:</span>
              <span className="text-white font-bold block">{credentials.instanceId}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Engine ID:</span>
              <span className="text-white block">{credentials.engineId}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Engine API Key:</span>
              <div className="flex items-center justify-between gap-2 mt-1 bg-zinc-900 p-2 rounded border border-zinc-700">
                <span className="text-emerald-400 font-bold break-all">{credentials.apiKey}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.apiKey);
                    toast.success('Copied', 'API key copied to clipboard');
                  }}
                  className="shrink-0 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  title="Copy API key"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-zinc-500 block">Launch Command:</span>
              <div className="flex items-center justify-between gap-2 mt-1 bg-zinc-900 p-2 rounded border border-zinc-700">
                <span className="text-cyan-300 font-mono text-[11px] break-all">
                  dotnet run --project core/src/Engine -- --instance {credentials.instanceId} --engine-id {credentials.engineId} --key &quot;{credentials.apiKey}&quot; --username {userName} --password trader123 --endpoint ws://localhost:5000/engine
                </span>
                <button
                  onClick={() => {
                    const cmd = `dotnet run --project core/src/Engine -- --instance ${credentials.instanceId} --engine-id ${credentials.engineId} --key "${credentials.apiKey}" --username ${userName} --password trader123 --endpoint ws://localhost:5000/engine`;
                    navigator.clipboard.writeText(cmd);
                    toast.success('Copied', 'Launch command copied to clipboard');
                  }}
                  className="shrink-0 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  title="Copy launch command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 font-sans">
              <span className="text-emerald-400 font-semibold font-mono block mb-0.5">✓ Zero-Broker Paper Trading Ready</span>
              Engine defaults to <code className="text-cyan-300">MockPaperTradingAdapter</code>. Generates synthetic brownian motion ticks and simulates zero-dependency order execution.
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-mono font-bold transition-colors"
          >
            Close & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
