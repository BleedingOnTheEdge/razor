'use client';

import React from 'react';
import { Terminal } from 'lucide-react';

export interface RunnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RunnerGuideModal({ isOpen, onClose }: RunnerGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span>Local Engine Runner & Instancing Guide</span>
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs font-mono"
          >
            ✕ Close
          </button>
        </div>

        <div className="space-y-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-cyan-400 font-bold block">1. Architecture & Instancing Model</span>
            <p className="text-zinc-300 font-sans leading-relaxed">
              Razor Engine nodes run as high-performance autonomous C#/.NET daemons. Each engine node connects over a persistent, duplex WebSocket transport to the Cloud Control Plane at <code className="text-white">ws://localhost:5000/engine</code>, automatically sending heartbeats, reporting manifest capabilities, and executing dispatched commands.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-cyan-400 font-bold block">2. Built-in Mock Paper Trading Adapter</span>
            <p className="text-zinc-300 font-sans leading-relaxed">
              Developers on the <strong>Free Tier</strong> do not need live broker credentials or exchanges. Razor ships with <code className="text-emerald-400">MockPaperTradingAdapter</code> in the SDK. It simulates realistic Brownian motion tick streaming, order matching, position keeping, and account balances completely in-memory.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-cyan-400 font-bold block">3. Launching Engine Locally via CLI</span>
            <pre className="p-3 rounded bg-zinc-900 text-zinc-300 overflow-x-auto text-[11px] leading-relaxed border border-zinc-800">
{`# From repository root:
dotnet run --project core/src/Engine -- \\
  --instance <INSTANCE_GUID> \\
  --key <GENERATED_API_KEY> \\
  --cloud http://localhost:5000`}
            </pre>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-cyan-400 font-bold block">4. Launching with Lerd / Podman Quadlets</span>
            <pre className="p-3 rounded bg-zinc-900 text-zinc-300 overflow-x-auto text-[11px] leading-relaxed border border-zinc-800">
{`# Containerized runner:
podman run --network host \\
  -e RAZOR_INSTANCE_ID="<INSTANCE_GUID>" \\
  -e RAZOR_API_KEY="<GENERATED_API_KEY>" \\
  -e RAZOR_CLOUD_URL="http://localhost:5000" \\
  razor-engine:latest`}
            </pre>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-mono font-bold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
