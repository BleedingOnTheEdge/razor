import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-6">
        <FileQuestion className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-mono">
        404 — Resource Not Found
      </h1>
      <p className="mt-2 text-sm text-zinc-400 max-w-md font-sans">
        The requested instance, run, report, or lineage path does not exist or has been removed.
      </p>

      <div className="mt-8">
        <Link
          href="/"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold rounded-lg text-xs font-mono transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>
    </div>
  );
}
