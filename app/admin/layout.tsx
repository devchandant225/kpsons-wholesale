'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Store } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show the admin header on the login page itself
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    // The session cookie is httpOnly, so ask the server to clear it.
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
      <header className="bg-[#123f28] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#3fcf63] text-[#123f28] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <Link href="/admin" className="font-bold text-lg tracking-tight hover:opacity-90">
                KP & Sons Wholesale
              </Link>
              <span className="ml-2 text-xs uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded text-slate-200">
                Compliance Admin
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="https://kpsonswholesale.com"
              target="_blank"
              className="text-xs text-white/80 hover:text-white flex items-center gap-1.5 transition"
            >
              <Store className="w-4 h-4" />
              <span>View Store</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} KP & Sons Wholesale Inc. &bull; Wholesale Compliance & Account Management
      </footer>
    </div>
  );
}
