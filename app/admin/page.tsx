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
  RefreshCw,
  AlertCircle,
  Link2,
  Download,
  ChevronRight,
  ChevronLeft,
  Inbox,
  X,
} from 'lucide-react';
import { IWholesaleApplication } from '@/types';
import { readJson } from '@/lib/read-json';
import {
  Avatar,
  Button,
  KpiCard,
  PageHeader,
  StatusBadge,
  buttonClass,
  cx,
  formatDate,
  statusLabel,
  timeAgo,
} from '@/components/admin/ui';

type Filter = 'ALL' | 'PENDING' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED';
type Counts = { all: number; pending: number; approved: number; rejected: number; needsInfo: number };

const PAGE_SIZE = 20;

const TABS: Array<{ key: Filter; label: string; count: (c: Counts) => number }> = [
  { key: 'PENDING', label: 'Pending', count: (c) => c.pending },
  { key: 'NEEDS_INFO', label: 'Needs info', count: (c) => c.needsInfo },
  { key: 'APPROVED', label: 'Approved', count: (c) => c.approved },
  { key: 'REJECTED', label: 'Rejected', count: (c) => c.rejected },
  { key: 'ALL', label: 'All', count: (c) => c.all },
];

const REQUIRED_DOCS: Array<{ key: 'tobaccoLicense' | 'salesTaxLicense' | 'feinForm'; label: string }> = [
  { key: 'tobaccoLicense', label: 'Tobacco license' },
  { key: 'salesTaxLicense', label: 'Sales tax certificate' },
  { key: 'feinForm', label: 'EIN letter' },
];

function DocsIndicator({ app }: { app: IWholesaleApplication }) {
  const have = REQUIRED_DOCS.filter((d) => app.documents?.[d.key]).length;
  const complete = have === REQUIRED_DOCS.length;
  return (
    <div className="flex items-center gap-2" title={REQUIRED_DOCS.map((d) => `${d.label}: ${app.documents?.[d.key] ? 'attached' : 'missing'}`).join('\n')}>
      <div className="flex gap-1">
        {REQUIRED_DOCS.map((d) => (
          <span
            key={d.key}
            className={cx('h-1.5 w-4 rounded-full', app.documents?.[d.key] ? 'bg-emerald-500' : 'bg-slate-200')}
          />
        ))}
      </div>
      <span className={cx('text-xs font-medium tabular-nums', complete ? 'text-emerald-700' : 'text-amber-700')}>
        {have}/{REQUIRED_DOCS.length}
      </span>
    </div>
  );
}

function toCsv(rows: IWholesaleApplication[]) {
  const header = ['Business', 'DBA', 'Email', 'Phone', 'City', 'State', 'Status', 'Documents', 'Sales rep', 'Submitted'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((a) =>
    [
      a.businessName,
      a.dba,
      a.email,
      a.businessPhone,
      a.address.city,
      a.address.state,
      statusLabel(a.status),
      `${REQUIRED_DOCS.filter((d) => a.documents?.[d.key]).length}/${REQUIRED_DOCS.length}`,
      a.assignedSalesRep,
      formatDate(a.createdAt),
    ]
      .map(esc)
      .join(',')
  );
  return [header.map(esc).join(','), ...lines].join('\n');
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<IWholesaleApplication[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, pending: 0, approved: 0, rejected: 0, needsInfo: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState<Filter>('PENDING');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [shopify, setShopify] = useState<{
    connected: boolean;
    canConnect: boolean;
    method: string | null;
    shop: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/shopify/status')
      .then((res) => readJson(res))
      .then((data) => {
        if (data.ok) setShopify(data);
      })
      .catch(() => {});
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (activeSearch) params.set('search', activeSearch);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      const res = await fetch(`/api/admin/applications?${params.toString()}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await readJson(res);
      if (data.ok) {
        setApplications(data.applications || []);
        if (data.counts) setCounts({ needsInfo: 0, ...data.counts });
        if (data.pagination) setPagination(data.pagination);
        setUpdatedAt(new Date());
      } else {
        setLoadError(data.error || 'Failed to load applications.');
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
      setLoadError('Failed to load applications. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, activeSearch]);

  const changeFilter = (f: Filter) => {
    setStatusFilter(f);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(search.trim());
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
    setActiveSearch('');
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(applications)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kp-applications-${statusFilter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const decided = counts.approved + counts.rejected;
  const approvalRate = decided ? Math.round((counts.approved / decided) * 100) : null;
  const firstRow = pagination.total === 0 ? 0 : (pagination.page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(pagination.page * PAGE_SIZE, pagination.total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale applications"
        description={
          <>
            Verify retail licenses and tax certificates, then approve buyer accounts.
            {updatedAt && <span className="text-slate-400"> · Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
          </>
        }
        actions={
          <>
            <Button onClick={exportCsv} disabled={loading || applications.length === 0} title="Export the rows on this page">
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
            <Button onClick={fetchApplications} disabled={loading}>
              <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
          </>
        }
      />

      {/* Shopify connection */}
      {shopify && !shopify.connected && !shopify.canConnect && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Shopify isn&apos;t connected.</strong> Approving an application needs access to {shopify.shop}. Set
            SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env first.
          </span>
        </div>
      )}
      {shopify && !shopify.connected && shopify.canConnect && shopify.method !== 'client_credentials' && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-amber-900">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <span>
              <strong>Shopify isn&apos;t connected.</strong> Approving an application needs access to {shopify.shop}.
            </span>
          </div>
          <a href="/api/shopify/install" className={buttonClass('primary', 'md', 'whitespace-nowrap')}>
            <Link2 className="h-4 w-4" />
            <span>Connect Shopify</span>
          </a>
        </div>
      )}
      {shopify && shopify.connected && shopify.method === 'oauth' && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Shopify connected ({shopify.shop}).</span>
          <a href="/api/shopify/install" className="font-semibold text-[#123f28] hover:underline">
            Reconnect
          </a>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Pending review"
          value={counts.pending}
          hint={counts.needsInfo ? `${counts.needsInfo} waiting on applicant` : 'Awaiting a decision'}
          icon={Clock}
          tone="amber"
          active={statusFilter === 'PENDING'}
          onClick={() => changeFilter('PENDING')}
        />
        <KpiCard
          label="Approved accounts"
          value={counts.approved}
          hint={approvalRate !== null ? `${approvalRate}% approval rate` : 'No decisions yet'}
          icon={CheckCircle2}
          tone="emerald"
          active={statusFilter === 'APPROVED'}
          onClick={() => changeFilter('APPROVED')}
        />
        <KpiCard
          label="Rejected"
          value={counts.rejected}
          hint="Applicant was emailed the reason"
          icon={XCircle}
          tone="red"
          active={statusFilter === 'REJECTED'}
          onClick={() => changeFilter('REJECTED')}
        />
        <KpiCard
          label="Total submissions"
          value={counts.all}
          hint="All time"
          icon={FileText}
          tone="slate"
          active={statusFilter === 'ALL'}
          onClick={() => changeFilter('ALL')}
        />
      </div>

      {/* Table card */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 pt-3 lg:flex-row lg:items-end lg:justify-between lg:px-5">
          <div className="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter by status">
            {TABS.map((t) => {
              const active = statusFilter === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeFilter(t.key)}
                  className={cx(
                    'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition',
                    active ? 'border-[#123f28] text-[#123f28]' : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  {t.label}
                  <span
                    className={cx(
                      'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                      active ? 'bg-[#123f28] text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {t.count(counts)}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full pb-3 lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business, email, state…"
              aria-label="Search applications"
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-8 text-sm placeholder:text-slate-400 focus:border-[#123f28] focus:outline-none focus:ring-1 focus:ring-[#123f28]"
            />
            {activeSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {activeSearch && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-600">
            Results for <strong>&ldquo;{activeSearch}&rdquo;</strong> in {TABS.find((t) => t.key === statusFilter)?.label.toLowerCase()}
          </div>
        )}

        {loadError && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4" />
            {loadError}
          </div>
        )}

        {loading && applications.length === 0 ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
                <div className="h-9 w-9 rounded-md bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
                <div className="hidden h-5 w-20 rounded bg-slate-100 sm:block" />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">No applications here</p>
            <p className="mt-1 text-sm text-slate-500">
              {activeSearch ? 'Try a different search or status.' : 'New submissions will appear in this list.'}
            </p>
          </div>
        ) : (
          <div className={cx('transition-opacity', loading && 'opacity-60')}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="px-5 py-3 font-medium">Business</th>
                    <th scope="col" className="px-4 py-3 font-medium">Contact</th>
                    <th scope="col" className="px-4 py-3 font-medium">Location</th>
                    <th scope="col" className="px-4 py-3 font-medium">Documents</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => router.push(`/admin/applications/${app.id}`)}
                      className="group cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={app.businessName} />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/applications/${app.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block max-w-[16rem] truncate font-semibold text-slate-900 hover:text-[#123f28]"
                            >
                              {app.businessName}
                            </Link>
                            {app.dba && <div className="max-w-[16rem] truncate text-xs text-slate-500">DBA {app.dba}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="max-w-[14rem] truncate text-slate-800">{app.email}</div>
                        <div className="text-xs text-slate-500">{app.businessPhone || 'No phone'}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                        {app.address.city}, {app.address.state}
                      </td>
                      <td className="px-4 py-3.5">
                        <DocsIndicator app={app} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="text-slate-700">{formatDate(app.createdAt)}</div>
                        <div className="text-xs text-slate-400">{timeAgo(app.createdAt)}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {applications.map((app) => (
                <li key={app.id}>
                  <Link href={`/admin/applications/${app.id}`} className="flex gap-3 px-4 py-4 active:bg-slate-50">
                    <Avatar name={app.businessName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate font-semibold text-slate-900">{app.businessName}</span>
                        <StatusBadge status={app.status} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{app.email}</div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                          {app.address.city}, {app.address.state} · {timeAgo(app.createdAt)}
                        </span>
                        <DocsIndicator app={app} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 lg:px-5">
            <span>
              Showing <strong className="font-semibold text-slate-900">{firstRow}</strong>–
              <strong className="font-semibold text-slate-900">{lastRow}</strong> of{' '}
              <strong className="font-semibold text-slate-900">{pagination.total}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || pagination.page <= 1}>
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="text-xs text-slate-500 tabular-nums">
                {pagination.page} / {Math.max(1, pagination.totalPages)}
              </span>
              <Button
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || pagination.page >= pagination.totalPages}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
