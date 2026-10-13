'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Shield, Sparkles, Key, CheckCircle2, AlertCircle, Loader2, UserPlus, Building, Zap } from 'lucide-react';
import clsx from 'clsx';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, user } = useAuth();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [role, setRole] = useState<'Developer' | 'Trader' | 'Operator'>('Developer');
  const [tier, setTier] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await register({
        userName,
        password,
        accountName: accountName || undefined,
        role,
        subscriptionTier: tier,
      });

      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch {
      setError('Connection failure while reaching Razor Cloud');
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
              Already registered as <span className="font-mono text-cyan-400">{user.userName}</span>
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-sm transition-all"
          >
            Go to Marketplace
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[90vh] flex flex-col items-center justify-center p-6 text-zinc-100 relative overflow-hidden py-12">
      <div className="w-full max-w-lg space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-mono text-zinc-400 mb-2">
            <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Developer Onboarding</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Create Razor Account
          </h1>
          <p className="text-xs text-zinc-400">
            Provision a quantitative workspace and obtain credentials
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Username *</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. quantum-hedge"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all font-mono placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all font-mono placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Workspace / Firm Name (Optional)</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Citadel Alpha Desk"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all placeholder:text-zinc-500"
                />
              </div>
            </div>

            {/* Role selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-zinc-300">Select Role</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['Developer', 'Trader', 'Operator'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={clsx(
                      'p-2.5 rounded-xl border text-center transition-all',
                      role === r
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 font-semibold'
                        : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Subscription Tier selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-zinc-300">Initial Subscription Plan</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['Free', 'Pro', 'Enterprise'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={clsx(
                      'p-2.5 rounded-xl border text-center transition-all',
                      tier === t
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    )}
                  >
                    <div>{t}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {t === 'Free' ? '1 Instance' : t === 'Pro' ? '5 Instances' : 'Unlimited'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-600/50 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Workspace…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <Zap className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="border-t border-zinc-800/80 pt-4 text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium underline-offset-4 hover:underline">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
