'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  ExternalLink,
  Building2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { IWholesaleApplication } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<IWholesaleApplication[]>([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/applications?${params.toString()}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (data.ok) {
        setApplications(data.applications || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  return (
    <div className="space-y-6">
      {/* Header and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Wholesale Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verify retail licenses, tax certificates, and approve buyer accounts.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          className="inline-flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer p-5 rounded-xl border transition ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Review</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-amber-900">{counts.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`cursor-pointer p-5 rounded-xl border transition ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Approved Accounts</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-900">{counts.approved}</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`cursor-pointer p-5 rounded-xl border transition ${
            statusFilter === 'REJECTED'
              ? 'bg-red-50 border-red-300 ring-2 ring-red-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">Rejected / Issues</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-red-900">{counts.rejected}</div>
        </div>

        <div
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer p-5 rounded-xl border transition ${
            statusFilter === 'ALL'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Total Submissions</span>
            <FileText className="w-5 h-5 text-slate-500" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{counts.all}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === filter
                  ? 'bg-[#123f28] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, email, or state..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#123f28] transition"
          />
        </form>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Business / DBA</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Attached Docs</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#123f28]" />
                      <span>Loading applications…</span>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>No applications found matching the selected filter.</span>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={String(app._id)} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{app.businessName}</span>
                      </div>
                      {app.dba && (
                        <div className="text-xs text-slate-400 ml-5.5">DBA: {app.dba}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{app.email}</div>
                      <div className="text-xs text-slate-400">{app.businessPhone || 'No phone'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">
                        {app.address.city}, {app.address.state}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          title={app.documents?.tobaccoLicense ? 'Tobacco License Attached' : 'Missing Tobacco License'}
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            app.documents?.tobaccoLicense
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          Tobacco
                        </span>
                        <span
                          title={app.documents?.salesTaxLicense ? 'Sales Tax Attached' : 'Missing Sales Tax'}
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            app.documents?.salesTaxLicense
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          Tax
                        </span>
                        <span
                          title={app.documents?.feinForm ? 'FEIN Form Attached' : 'Missing FEIN'}
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            app.documents?.feinForm
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          FEIN
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {app.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                        {app.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        <span>{app.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/applications/${String(app._id)}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#123f28] hover:text-[#0b2a1a] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <span>Review</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
