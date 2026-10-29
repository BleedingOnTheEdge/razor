'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { UserPlus, Terminal, ArrowRight, AlertCircle, Loader2, Shield } from 'lucide-react';

export default function AuthRegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [userName, setUserName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [role, setRole] = useState<'Operator' | 'Trader' | 'Developer'>('Operator');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register({
        userName: userName.trim(),
        password,
        accountName: accountName.trim() || `${userName.trim()}-Workspace`,
        role,
        subscriptionTier: 'Free',
      });

      if (res.success) {
        router.push('/panel');
      } else {
        setError(res.error || 'Registration rejected');
      }
    } catch {
      setError('Connection failure while reaching Cloud control plane');
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
            Create Account
          </h1>
          <p className="text-xs text-zinc-100 font-bold">
            Register a workspace identity to manage instances, stream telemetry, and trade
          </p>
        </div>

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
                placeholder="e.g. quant-lead"
                required
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#262626] text-zinc-100 text-sm font-bold focus:outline-none focus:border-[#3ECF8E] placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-100 uppercase">
                Workspace / Organization Name (Optional)
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Alpha Quant Lab"
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#262626] text-zinc-100 text-sm font-bold focus:outline-none focus:border-[#3ECF8E] placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-100 uppercase">Platform Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Operator', 'Trader', 'Developer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-2 border text-xs font-bold transition-colors text-center ${
                      role === r
                        ? 'bg-black text-white border-[#262626]'
                        : 'bg-[#171717] text-zinc-100 rounded-xl border-[#262626] hover:bg-[#1f1f1f]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-100 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#262626] text-zinc-100 text-sm font-bold focus:outline-none focus:border-[#3ECF8E] placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-100 uppercase">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#262626] text-zinc-100 text-sm font-bold focus:outline-none focus:border-[#3ECF8E] placeholder:text-zinc-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] rounded-full font-medium disabled:opacity-50 font-bold text-sm border border-[#262626] flex items-center justify-center gap-2 mt-4 transition-colors uppercase"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>REGISTERING WORKSPACE...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register & Open Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-[#262626] pt-4 text-center">
            <Link href="/auth/login" className="text-xs font-bold text-zinc-100 hover:underline uppercase">
              Already have an account? Sign in here &rarr;
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
