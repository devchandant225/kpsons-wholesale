import Link from 'next/link';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-[#123f28] text-[#3fcf63] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">KP & Sons Wholesale</h1>
        <p className="text-xs uppercase tracking-widest text-[#123f28] font-bold mt-1">
          Wholesale Auth &amp; Compliance Server
        </p>

        <div className="my-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>API Service is operational</span>
        </div>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          This server powers the wholesale retailer registration, document verification, session gate, and Shopify customer account synchronization for KP & Sons Wholesale.
        </p>

        <div className="space-y-3">
          <Link
            href="/admin"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#123f28] hover:bg-[#0b2a1a] text-white py-3 px-4 rounded-xl text-sm font-bold transition shadow-sm"
          >
            <span>Open Staff Review Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="https://kpsonswholesale.com"
            target="_blank"
            className="w-full inline-flex items-center justify-center text-xs font-semibold text-slate-600 hover:text-slate-900 py-2"
          >
            Visit kpsonswholesale.com &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
