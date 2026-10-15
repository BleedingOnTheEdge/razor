import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
  title: 'Razor Marketplace — Curated Extensions & Plugins',
  description: 'Curated strategies, adapters, indicators, and neural networks for the Razor Trading Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-800 flex flex-col justify-between">
        <AuthProvider>
          <ToastProvider>
            <div>
              <Navbar />
              <main className="max-w-7xl mx-auto px-6 py-8" role="main">
                {children}
              </main>
            </div>

            <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-white/50 dark:bg-zinc-950/50">
              <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span>Razor Marketplace • Curated Trading Ecosystem</span>
                <span>Compatible with Razor Engine v1.0.0 LTS</span>
              </div>
            </footer>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
