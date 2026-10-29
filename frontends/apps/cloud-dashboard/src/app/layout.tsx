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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f0f0f] text-[#ededed] font-sans antialiased selection:bg-[#3ECF8E]/30 selection:text-[#3ECF8E]">
        <AuthProvider>
          <ToastProvider>
            <DashboardShell>{children}</DashboardShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
