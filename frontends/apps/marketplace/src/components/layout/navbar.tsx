'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  ArrowUpRight,
  UploadCloud,
  Compass,
  MessageSquare,
  LifeBuoy,
  Zap,
  Shield,
  Check,
  Loader2,
  User,
  LogOut,
  LogIn,
  UserPlus,
  KeyRound,
  CreditCard,
} from 'lucide-react';
import clsx from 'clsx';
import { getApiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const toast = useToast();

  const handleUpgrade = async (tier: 'Pro' | 'Enterprise') => {
    if (!user) return;
    try {
      setUpgrading(true);
      const client = getApiClient();
      const res = await client.POST('/api/accounts/{accountId}/subscription', {
        params: { path: { accountId: user.accountId } },
        body: { tier },
      });

      if (res.data) {
        toast.success('Subscription Upgraded', `Successfully upgraded to ${tier} Tier! Reloading profile.`);
        setIsUpgradeOpen(false);
        // Refresh session
        if (typeof window !== 'undefined') {
          localStorage.setItem('razor_auth_user', JSON.stringify(res.data));
          window.location.reload();
        }
      }
    } catch {
      toast.error('Upgrade Failed', 'Failed to upgrade subscription');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-zinc-950 shadow-lg shadow-indigo-500/20">
                <ShoppingBag className="w-4 h-4 text-zinc-950" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-zinc-900 dark:text-white block text-sm">RAZOR MARKETPLACE</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">Curated Extensions</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
              <Link
                href="/"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                  pathname === '/'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/60'
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore</span>
              </Link>

              <Link
                href="/community"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                  pathname?.startsWith('/community')
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/60'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Community & Additives</span>
              </Link>

              <Link
                href="/tickets"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                  pathname === '/tickets'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/60'
                )}
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Support Tickets</span>
              </Link>

              <Link
                href="/my-licenses"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                  pathname === '/my-licenses'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/60'
                )}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>My Licenses</span>
              </Link>

              <Link
                href="/publish"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                  pathname === '/publish'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/60'
                )}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Publisher Portal</span>
              </Link>

              <Link
                href="/payments"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                  pathname === '/payments'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/60'
                )}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payments</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {/* Subscription Tier Pill */}
                <button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 dark:border-zinc-700/60 dark:text-zinc-300 transition-all cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  <span>{user.subscriptionTier} Plan</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    {user.maxInstances} inst
                  </span>
                </button>

                {/* User Identity Pill */}
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 dark:border-zinc-700/60 dark:text-zinc-300 transition-colors"
                  title="View Profile"
                >
                  <User className="w-3 h-3 text-indigo-600 dark:text-cyan-400" />
                  <span>{user.userName}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800/60 font-semibold uppercase">
                    {user.role}
                  </span>
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-full bg-zinc-100 hover:bg-rose-50 hover:border-rose-200 border border-zinc-200 text-zinc-500 hover:text-rose-600 dark:bg-zinc-800/60 dark:hover:bg-rose-500/10 dark:hover:border-rose-500/30 dark:border-zinc-700/60 dark:text-zinc-400 dark:hover:text-rose-400 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-mono font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}

            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL || '/'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-transparent dark:text-zinc-300 text-xs font-mono transition-colors"
            >
              <span>Operator Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Subscription Upgrade Modal */}
      {isUpgradeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  <span>Account Subscription & Resource Entitlements</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Current tier: <strong className="text-zinc-900 dark:text-white">{user?.subscriptionTier} Tier</strong> ({user?.userName})
                </p>
              </div>
              <button
                onClick={() => setIsUpgradeOpen(false)}
                className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-mono px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Free Tier Card */}
              <div className={`p-5 rounded-xl border space-y-4 ${user?.subscriptionTier === 'Free' ? 'bg-indigo-50/70 border-indigo-500/60 dark:bg-zinc-800/40' : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">Developer Free Tier</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Zero cost, ideal for algorithmic research</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">$0/mo</span>
                </div>

                <ul className="text-xs space-y-2 text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>1 Local / Remote Engine Instance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Built-in MockPaperTradingAdapter</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Access to Additives Hub & Forums</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Community Support Ticketing</span>
                  </li>
                </ul>

                {user?.subscriptionTier === 'Free' && (
                  <div className="text-center py-1.5 bg-zinc-200 dark:bg-zinc-800 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 rounded-lg">
                    Current Active Tier
                  </div>
                )}
              </div>

              {/* Pro Tier Card */}
              <div className={`p-5 rounded-xl border space-y-4 ${user?.subscriptionTier === 'Pro' ? 'bg-indigo-50/70 border-indigo-500/60 dark:bg-zinc-800/40' : 'bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border-indigo-300 dark:border-indigo-600/40'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">Pro Trader Tier</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">High-frequency capital deployment</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">$199/mo</span>
                </div>

                <ul className="text-xs space-y-2 text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>5 Engine Instances (Live execution)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Sub-millisecond Lineage DAG Tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Priority Support SLAs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Curated Additive Distribution</span>
                  </li>
                </ul>

                {user?.subscriptionTier === 'Pro' ? (
                  <div className="text-center py-1.5 bg-zinc-200 dark:bg-zinc-800 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 rounded-lg">
                    Current Active Tier
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade('Pro')}
                    disabled={upgrading}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {upgrading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Upgrade to Pro Tier</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
