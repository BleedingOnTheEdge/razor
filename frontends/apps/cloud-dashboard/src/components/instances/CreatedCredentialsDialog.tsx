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
      <div className="bg-[#171717] border border-[#262626] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <h3 className="text-base font-semibold text-zinc-100 font-mono flex items-center gap-2">
            <Key className="w-4 h-4 text-[#3ECF8E]" />
            <span>Engine Daemon Credentials</span>
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-400 text-xs font-mono transition-colors"
          >
            ✕ Close
          </button>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <p className="text-zinc-400 font-sans leading-relaxed">
            Copy the engine credentials and local launch command below. Run this command in your terminal to start the autonomous daemon.
          </p>

          <div className="p-3.5 rounded-xl bg-[#141414] border border-[#262626] space-y-2.5">
            <div>
              <span className="text-zinc-500 block font-sans">Instance ID:</span>
              <span className="text-zinc-100 font-semibold block">{credentials.instanceId}</span>
            </div>
            <div>
              <span className="text-zinc-500 block font-sans">Engine ID:</span>
              <span className="text-zinc-100 block">{credentials.engineId}</span>
            </div>
            <div>
              <span className="text-zinc-500 block font-sans">Engine API Key:</span>
              <div className="flex items-center justify-between gap-2 mt-1 bg-[#171717] p-2 rounded-lg border border-[#262626] shadow-sm">
                <span className="text-[#3ECF8E] font-semibold break-all">{credentials.apiKey}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.apiKey);
                    toast.success('Copied', 'API key copied to clipboard');
                  }}
                  className="shrink-0 p-1.5 rounded-md bg-[#1f1f1f] hover:bg-[#262626] text-zinc-300 border border-[#262626] transition-colors"
                  title="Copy API key"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-zinc-500 block font-sans">CLI Launch Command:</span>
              <div className="flex items-center justify-between gap-2 mt-1 bg-[#171717] p-2 rounded-lg border border-[#262626] shadow-sm">
                <span className="text-zinc-200 font-mono text-[11px] break-all leading-tight">
                  {launchCommand}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(launchCommand);
                    toast.success('Copied', 'Launch command copied to clipboard');
                  }}
                  className="shrink-0 p-1.5 rounded-md bg-[#1f1f1f] hover:bg-[#262626] text-zinc-300 border border-[#262626] transition-colors"
                  title="Copy launch command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/20/70 border border-emerald-500/30/70 text-[11px] text-zinc-300 font-sans">
              <span className="text-[#3ECF8E] font-semibold font-mono block mb-0.5">✓ Zero-Broker Paper Trading Ready</span>
              Engine defaults to <code className="text-emerald-900 font-semibold">MockPaperTradingAdapter</code>. Generates synthetic brownian motion ticks and simulates zero-dependency order execution out of the box.
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-medium transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
