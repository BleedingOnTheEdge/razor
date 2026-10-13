import Link from 'next/link';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center mx-auto">
          <HelpCircle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight text-white font-mono">
            Extension Not Found
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The requested extension listing or catalogue resource does not exist or has been removed from the registry.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-colors shadow-lg shadow-indigo-600/20"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Catalogue</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
