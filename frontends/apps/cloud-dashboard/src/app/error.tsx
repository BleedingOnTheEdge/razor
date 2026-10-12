'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client-side runtime exception
    console.error('Unhandled Cloud Dashboard runtime exception:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-950/20">
        <AlertOctagon className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-mono">
        Application Error Encounted
      </h1>
      <p className="mt-2 text-sm text-zinc-400 max-w-md font-sans">
        An unexpected error occurred within the Operator Control Plane. The boundary caught the fault safely.
      </p>

      {error.message && (
        <div className="mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-rose-400 font-mono text-xs max-w-lg overflow-x-auto text-left">
          {error.message}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold rounded-lg text-xs font-mono transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg text-xs font-mono transition-colors flex items-center gap-2"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Overview</span>
        </Link>
      </div>
    </div>
  );
}
