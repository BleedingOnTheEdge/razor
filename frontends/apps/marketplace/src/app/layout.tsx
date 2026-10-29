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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f0f0f] text-[#ededed] font-sans antialiased selection:bg-[#3ECF8E]/30 selection:text-[#3ECF8E] flex flex-col justify-between">
        <AuthProvider>
          <ToastProvider>
            <div>
              <Navbar />
              <main className="max-w-7xl mx-auto px-6 py-8" role="main">
                {children}
              </main>
            </div>

            <footer className="border-t border-[#262626] py-8 text-center text-xs text-zinc-500 font-mono bg-[#171717]/60">
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
