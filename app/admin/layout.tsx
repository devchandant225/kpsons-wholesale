'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Store, Inbox, Menu, X, ChevronRight, CircleDot } from 'lucide-react';
import { readJson } from '@/lib/read-json';
import { cx } from '@/components/admin/ui';

type ShopifyStatus = { connected: boolean; canConnect: boolean; method: string | null; shop: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [shopify, setShopify] = useState<ShopifyStatus | null>(null);

  const isLogin = pathname === '/admin/login';

  // Pending count for the sidebar badge, refreshed on every page change
  // (approving or rejecting navigates back to the list).
  useEffect(() => {
    if (isLogin) return;
    setNavOpen(false);
    fetch('/api/admin/applications?status=PENDING&limit=1')
      .then((res) => (res.ok ? readJson(res) : null))
      .then((data) => {
        if (data && data.ok && data.counts) setPending(data.counts.pending);
      })
      .catch(() => {});
  }, [pathname, isLogin]);

  useEffect(() => {
    if (isLogin) return;
    fetch('/api/shopify/status')
      .then((res) => (res.ok ? readJson(res) : null))
      .then((data) => {
        if (data && data.ok) setShopify(data);
      })
      .catch(() => {});
  }, [isLogin]);

  // Don't show the console chrome on the login page itself.
  if (isLogin) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    // The session cookie is httpOnly, so ask the server to clear it.
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/admin/login');
  };

  const onApplications = pathname === '/admin' || pathname.startsWith('/admin/applications');
  const crumbs: Array<{ label: string; href?: string }> = [{ label: 'Applications', href: '/admin' }];
  if (pathname.startsWith('/admin/applications/')) crumbs.push({ label: 'Application details' });
  const shopifyOk = !!shopify && (shopify.connected || shopify.canConnect);

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0f3321] text-white">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#3fcf63] text-[#123f28]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 leading-tight">
          <Link href="/admin" className="block truncate text-sm font-semibold">
            KP &amp; Sons Wholesale
          </Link>
          <span className="text-[11px] uppercase tracking-wider text-white/55">Compliance console</span>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Admin">
        <div>
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Manage</p>
          <Link
            href="/admin"
            aria-current={onApplications ? 'page' : undefined}
            className={cx(
              'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition',
              onApplications ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
            )}
          >
            <Inbox className="h-4 w-4" />
            <span className="flex-1">Applications</span>
            {pending !== null && pending > 0 && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950 tabular-nums">
                {pending}
              </span>
            )}
          </Link>
        </div>

        <div>
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Storefront</p>
          <a
            href="https://kpsonswholesale.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <Store className="h-4 w-4" />
            <span>View store</span>
          </a>
        </div>
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        {shopify && (
          <div className="flex items-center gap-2 text-xs text-white/70">
            <CircleDot className={cx('h-3.5 w-3.5', shopifyOk ? 'text-[#3fcf63]' : 'text-amber-400')} />
            <span className="truncate">Shopify {shopify.connected ? 'connected' : shopify.canConnect ? 'ready' : 'not connected'}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
            {sidebar}
            <button
              onClick={() => setNavOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            onClick={() => setNavOpen(true)}
            className="-ml-1 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-slate-400 sm:inline">Admin</span>
            {crumbs.map((c, i) => (
              <React.Fragment key={c.label}>
                <ChevronRight className={cx('h-4 w-4 flex-shrink-0 text-slate-300', i === 0 && 'hidden sm:block')} />
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="truncate text-slate-500 hover:text-slate-900">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-slate-900">{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {shopify && (
              <span
                className={cx(
                  'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset sm:inline-flex',
                  shopifyOk ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20'
                )}
                title={shopifyOk ? 'Shopify connection available' : 'Shopify is not connected'}
              >
                <span className={cx('h-1.5 w-1.5 rounded-full', shopifyOk ? 'bg-emerald-500' : 'bg-amber-500')} />
                {shopify.shop}
              </span>
            )}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#123f28] text-xs font-semibold text-white"
              title="Staff admin"
            >
              KP
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} KP &amp; Sons Wholesale Inc. · Wholesale compliance &amp; account management
        </footer>
      </div>
    </div>
  );
}
