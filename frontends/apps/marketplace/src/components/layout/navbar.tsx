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
  Check,
  Loader2,
  User,
  LogOut,
  LogIn,
  UserPlus,
  KeyRound,
  CreditCard,
  X,
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
      <header className="border-b border-[#262626] bg-[#171717]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between font-sans">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#3ECF8E] text-[#0f0f0f] flex items-center justify-center font-bold shadow-sm shadow-[#3ECF8E]/20">
                <ShoppingBag className="w-4 h-4 text-[#0f0f0f]" />
              </div>
              <div>
                <span className="font-semibold tracking-tight text-zinc-100 block text-xs">RAZOR MARKETPLACE</span>
                <span className="text-[9px] text-zinc-500 font-mono tracking-widest block">CURATED EXTENSIONS</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 font-sans text-xs">
              <Link
                href="/"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium',
                  pathname === '/'
                    ? 'bg-[#222222] text-[#3ECF8E] border border-[#333333]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore</span>
              </Link>

              <Link
                href="/community"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium',
                  pathname?.startsWith('/community')
                    ? 'bg-[#222222] text-[#3ECF8E] border border-[#333333]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Community & Additives</span>
              </Link>

              <Link
                href="/tickets"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium',
                  pathname === '/tickets'
                    ? 'bg-[#222222] text-[#3ECF8E] border border-[#333333]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
                )}
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Support Tickets</span>
              </Link>

              <Link
                href="/my-licenses"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium',
                  pathname === '/my-licenses'
                    ? 'bg-[#222222] text-[#3ECF8E] border border-[#333333]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
                )}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>My Licenses</span>
              </Link>

              <Link
                href="/publish"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium',
                  pathname === '/publish'
                    ? 'bg-[#222222] text-[#3ECF8E] border border-[#333333]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
                )}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Publisher Portal</span>
              </Link>

              <Link
                href="/payments"
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium',
                  pathname === '/payments'
                    ? 'bg-[#222222] text-[#3ECF8E] border border-[#333333]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]'
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
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#1f1f1f] hover:bg-[#262626] border border-[#2e2e2e] text-zinc-300 transition-all cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-[#3ECF8E]" />
                  <span>{user.subscriptionTier} Plan</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2a2a2a] text-[#3ECF8E]">
                    {user.maxInstances} inst
                  </span>
                </button>

                {/* User Identity Pill */}
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#1f1f1f] hover:bg-[#262626] border border-[#2e2e2e] text-zinc-300 transition-colors"
                  title="View Profile"
                >
                  <User className="w-3 h-3 text-[#3ECF8E]" />
                  <span>{user.userName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2a2a2a] text-zinc-400 font-semibold uppercase">
                    {user.role}
                  </span>
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-full bg-[#1f1f1f] hover:bg-rose-500/10 hover:border-rose-500/30 border border-[#2e2e2e] text-zinc-400 hover:text-rose-400 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1f1f1f] transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#3ECF8E] hover:bg-[#34b27b] text-xs font-medium text-[#0f0f0f] transition-all shadow-sm shadow-[#3ECF8E]/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}

            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL || '/panel'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1f1f1f] hover:bg-[#262626] border border-[#2e2e2e] text-zinc-300 text-xs font-medium transition-colors"
            >
              <span>Operator Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#3ECF8E]" />
            </a>
          </div>
        </div>
      </header>

      {/* Subscription Upgrade Modal */}
      {isUpgradeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171717] border border-[#262626] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#262626] pb-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 font-sans">
                  <Zap className="w-5 h-5 text-[#3ECF8E]" />
                  <span>Account Subscription & Resource Entitlements</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1 font-sans">
                  Current tier: <strong className="text-zinc-200 font-mono">{user?.subscriptionTier} Tier</strong> ({user?.userName})
                </p>
              </div>
              <button
                onClick={() => setIsUpgradeOpen(false)}
                className="text-zinc-400 hover:text-white rounded-full p-1.5 hover:bg-[#222222] transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Free Tier Card */}
              <div className={`p-5 rounded-xl border space-y-4 ${user?.subscriptionTier === 'Free' ? 'bg-[#1f1f1f] border-[#3ECF8E]/40' : 'bg-[#141414] border-[#262626]'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-zinc-100 text-base font-sans">Developer Free Tier</h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-sans">Zero cost, ideal for algorithmic research</p>
                  </div>
                  <span className="text-xs font-mono text-[#3ECF8E] font-semibold">$0/mo</span>
                </div>

                <ul className="text-xs space-y-2 text-zinc-300 font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>1 Local / Remote Engine Instance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>Built-in MockPaperTradingAdapter</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>Access to Additives Hub & Forums</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>Community Support Ticketing</span>
                  </li>
                </ul>

                {user?.subscriptionTier === 'Free' && (
                  <div className="text-center py-1.5 bg-[#262626] text-xs font-mono text-[#3ECF8E] rounded-lg">
                    Current Active Tier
                  </div>
                )}
              </div>

              {/* Pro Tier Card */}
              <div className={`p-5 rounded-xl border space-y-4 ${user?.subscriptionTier === 'Pro' ? 'bg-[#1f1f1f] border-[#3ECF8E]/40' : 'bg-[#141414] border-[#262626]'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-zinc-100 text-base font-sans">Pro Trader Tier</h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-sans">High-frequency capital deployment</p>
                  </div>
                  <span className="text-xs font-mono text-[#3ECF8E] font-semibold">$199/mo</span>
                </div>

                <ul className="text-xs space-y-2 text-zinc-300 font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>5 Engine Instances (Live execution)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>Sub-millisecond Lineage DAG Tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>Priority Support SLAs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                    <span>Curated Additive Distribution</span>
                  </li>
                </ul>

                {user?.subscriptionTier === 'Pro' ? (
                  <div className="text-center py-1.5 bg-[#262626] text-xs font-mono text-[#3ECF8E] rounded-lg">
                    Current Active Tier
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade('Pro')}
                    disabled={upgrading}
                    className="w-full py-2 rounded-full bg-[#3ECF8E] hover:bg-[#34b27b] text-[#0f0f0f] text-xs font-medium transition-all shadow-sm shadow-[#3ECF8E]/20 flex items-center justify-center gap-2 cursor-pointer"
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
