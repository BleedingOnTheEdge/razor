'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Shield, Key, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function MarketplaceLoginPage() {
  const router = useRouter();
  const { login, quickDemoLogin, isAuthenticated, user, logout } = useAuth();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(userName, password, customKey || undefined);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Authentication rejected');
      }
    } catch {
      setError('Connection failure while reaching Razor Cloud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (preset: 'admin' | 'operator' | 'developer' | 'trader') => {
    const creds = {
      admin: { name: 'admin-operator', pass: 'admin123' },
      operator: { name: 'dev-operator', pass: 'operator123' },
      developer: { name: 'algo-developer', pass: 'dev123' },
      trader: { name: 'pro-trader', pass: 'trader123' },
    }[preset];
    setUserName(creds.name);
    setPassword(creds.pass);
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await quickDemoLogin(preset);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Demo sign-in failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <main className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl shadow-2xl text-center space-y-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Active Session Detected</h2>
            <p className="text-xs text-zinc-400">
              Signed in as <span className="font-mono text-cyan-400">{user.userName}</span> ({user.role} · {user.subscriptionTier} Plan)
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              Browse Marketplace <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-all"
            >
              Sign Out / Switch Identity
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-zinc-100 relative overflow-hidden">
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-mono text-zinc-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Razor Ecosystem Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Sign In to Razor
          </h1>
          <p className="text-xs text-zinc-400">
            Access institutional additives, publish extensions, and join community discussions
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 backdrop-blur-xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Username</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. algo-developer"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all font-mono placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all font-mono placeholder:text-zinc-500"
              />
            </div>

            {/* Advanced toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors flex items-center gap-1 font-mono"
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
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs font-mono focus:outline-none focus:border-zinc-700 placeholder:text-zinc-600"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Custom shared key passed in X-Cloud-Management-Key header.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-600/50 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Section */}
          <div className="border-t border-zinc-800/80 pt-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Quick Demo Accounts</span>
              <span className="text-[10px] text-cyan-400 font-mono">1-Click Auto Fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('developer')}
                className="p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all hover:border-cyan-500/40 group"
              >
                <div className="flex items-center gap-1.5 font-semibold text-zinc-200 group-hover:text-cyan-300">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Developer</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Author Additives</div>
                <div className="text-[9px] font-mono text-zinc-500 mt-1">algo-developer / dev123</div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('trader')}
                className="p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all hover:border-cyan-500/40 group"
              >
                <div className="flex items-center gap-1.5 font-semibold text-zinc-200 group-hover:text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Pro Trader</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Live Algorithms</div>
                <div className="text-[9px] font-mono text-zinc-500 mt-1">pro-trader / trader123</div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('operator')}
                className="p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all hover:border-cyan-500/40 group"
              >
                <div className="flex items-center gap-1.5 font-semibold text-zinc-200 group-hover:text-cyan-300">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Operator</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Triage & Support</div>
                <div className="text-[9px] font-mono text-zinc-500 mt-1">dev-operator / operator123</div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('admin')}
                className="p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all hover:border-cyan-500/40 group"
              >
                <div className="flex items-center gap-1.5 font-semibold text-zinc-200 group-hover:text-cyan-300">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Cluster Overseer</div>
                <div className="text-[9px] font-mono text-zinc-500 mt-1">admin-operator / admin123</div>
              </button>
            </div>
          </div>

          {/* Registration link */}
          <div className="border-t border-zinc-800/80 pt-4 text-center text-xs text-zinc-400">
            Don't have an account yet?{' '}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium underline-offset-4 hover:underline">
              Register new account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
