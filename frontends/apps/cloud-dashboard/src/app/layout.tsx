import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/components/ui/toast';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const metadata: Metadata = {
  title: 'Razor Cloud — Control Plane Dashboard',
  description: 'Operator SaaS Control Plane for Razor Trading Engines',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-[#f8fafc] text-zinc-900 font-sans antialiased selection:bg-[#3ECF8E]/30 selection:text-emerald-900">
        <AuthProvider>
          <ToastProvider>
            <DashboardShell>{children}</DashboardShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
