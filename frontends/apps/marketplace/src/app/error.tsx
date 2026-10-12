'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors safely to console without crossing boundary with raw exception to user
    console.error('Unhandled Razor Marketplace runtime exception:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertOctagon className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight text-white font-mono">
            Marketplace Service Exception
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The catalogue interface encountered an unexpected error while executing your request.
            State has been preserved safely.
          </p>
        </div>

        {error.digest && (
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 select-all">
            Digest: {error.digest}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-colors shadow-lg shadow-indigo-600/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Action</span>
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Catalogue Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
