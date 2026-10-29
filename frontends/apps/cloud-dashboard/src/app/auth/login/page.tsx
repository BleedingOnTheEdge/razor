'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Shield, Key, Terminal, ArrowRight, CheckCircle2, AlertCircle, Loader2, LogOut } from 'lucide-react';

export default function AuthLoginPage() {
  const router = useRouter();
  const { login, quickDemoLogin, isAuthenticated, user, logout } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(userName, password, customKey || undefined);
      if (res.success) {
        router.push('/panel');
      } else {
        setError(res.error || 'Authentication rejected');
      }
    } catch {
      setError('Connection failure while reaching Cloud control plane');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (preset: 'admin' | 'operator' | 'trader') => {
    const creds = {
      admin: { name: 'admin-operator', pass: 'admin123' },
      operator: { name: 'dev-operator', pass: 'operator123' },
      trader: { name: 'pro-trader', pass: 'trader123' },
    }[preset];
    setUserName(creds.name);
    setPassword(creds.pass);
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await quickDemoLogin(preset);
      if (res.success) {
        router.push('/panel');
      } else {
        setError(res.error || 'Demo sign-in failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#171717] flex flex-col items-center justify-center p-6 text-zinc-100 font-mono">
      <div className="w-full max-w-md space-y-6">
        {/* Navigation back to landing */}
        <div className="flex items-center justify-between text-xs font-bold border-b border-[#262626] pb-3">
          <Link href="/" className="hover:underline flex items-center gap-1">
            &larr; BACK TO PLATFORM
          </Link>
          <span>RAZOR AUTH GATEWAY</span>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#262626] text-xs font-bold mb-1">
            <Terminal className="w-3.5 h-3.5 text-zinc-100" />
            <span>RAZOR ENGINE 1.0</span>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-100">
            Operator Control Plane
          </h1>
          <p className="text-xs text-zinc-100 font-bold">
            Sign in to manage instances, stream telemetry, and triage incidents
          </p>
        </div>

        {/* Active Session Notice if logged in */}
        {mounted && isAuthenticated && user && (
          <div className="p-4 border border-[#262626] bg-[#141414] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                ACTIVE SESSION
              </span>
              <span className="border border-[#262626] px-1.5 py-0.5 text-[10px]">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-zinc-100">
              Signed in as <strong className="underline">{user.userName}</strong>. You can enter the operator terminal or sign in with another identity below.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.push('/panel')}
                className="py-2 px-3 bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium text-xs font-bold border border-[#262626] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>ENTER PANEL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="py-2 px-3 bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] text-xs font-bold border border-[#262626] flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>SIGN OUT</span>
              </button>
            </div>
          </div>
        )}

        {/* Auth Form Card */}
        <div className="p-8 bg-[#171717] border border-[#262626] space-y-6">
          {error && (
            <div className="p-3.5 border border-[#262626] bg-[#171717] text-rose-400 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-100 uppercase">Username</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. dev-operator"
                required
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#262626] text-zinc-100 text-sm font-bold focus:outline-none focus:border-[#3ECF8E] placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-100 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#262626] text-zinc-100 text-sm font-bold focus:outline-none focus:border-[#3ECF8E] placeholder:text-zinc-400"
              />
            </div>

            {/* Advanced toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] text-zinc-100 hover:underline transition-colors flex items-center gap-1 font-bold"
              >
                <Key className="w-3 h-3" />
                {showAdvanced ? 'Hide advanced API key' : 'Custom Management API Key (Optional)'}
              </button>

              {showAdvanced && (
                <div className="mt-2 space-y-1">
                  <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="dev-cloud-management-key-3000"
                    className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-zinc-100 text-xs font-bold focus:outline-none focus:border-[#3ECF8E]"
                  />
                  <p className="text-[10px] text-zinc-100">
                    Overrides default shared management key sent in X-Cloud-Management-Key header.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium disabled:opacity-50 font-bold text-sm border border-[#262626] flex items-center justify-center gap-2 mt-2 transition-colors uppercase"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="border-t border-[#262626] pt-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-100 font-bold uppercase">
              <span>Quick Demo Accounts</span>
              <span className="text-[10px] border border-[#262626] px-1">1-CLICK</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('admin')}
                className="p-2.5 bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] border border-[#262626] text-left transition-colors group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">Cluster Overseer</div>
                <div className="text-[9px] mt-1 font-bold text-zinc-500 group-hover:text-zinc-300">
                  admin-operator / admin123
                </div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('operator')}
                className="p-2.5 bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] border border-[#262626] text-left transition-colors group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Operator</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">Instance Manager</div>
                <div className="text-[9px] mt-1 font-bold text-zinc-500 group-hover:text-zinc-300">
                  dev-operator / operator123
                </div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('trader')}
                className="p-2.5 bg-[#171717] hover:bg-[#222222] text-zinc-200 rounded-full font-medium border border-[#262626] border border-[#262626] text-left transition-colors group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Pro Trader</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">Live Execution</div>
                <div className="text-[9px] mt-1 font-bold text-zinc-500 group-hover:text-zinc-300">
                  pro-trader / trader123
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-[#262626] pt-4 text-center">
            <Link href="/auth/register" className="text-xs font-bold text-zinc-100 hover:underline uppercase">
              Don&apos;t have an account? Register here &rarr;
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-100 font-bold">
          ENDPOINT: <span className="underline">CLOUD CONTROL PLANE (/api)</span>
        </div>
      </div>
    </main>
  );
}
