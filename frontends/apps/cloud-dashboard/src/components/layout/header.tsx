'use client';

import { useSseStream } from '@/hooks/use-sse-stream';
import clsx from 'clsx';

export function Header() {
  const { isConnected } = useSseStream();

  return (
    <header className="h-16 border-b border-zinc-800 px-8 flex items-center justify-between bg-zinc-900/30" role="banner">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-zinc-200">
          Razor Operator Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        {/* SSE status pill */}
        <div
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs',
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          )}
          aria-live="polite"
        >
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            )}
          />
          <span>{isConnected ? 'SSE LIVE STREAM' : 'SSE RECONNECTING'}</span>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
          Cluster: <span className="text-cyan-400">Localhost:5000</span>
        </div>
      </div>
    </header>
  );
}
