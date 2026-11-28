'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  Loader2,
  Save,
  Trash2,
  Calendar,
  ShieldCheck,
  History,
} from 'lucide-react';
import { DocumentMeta, IWholesaleApplication } from '@/types';
import { readJson } from '@/lib/read-json';
import { Avatar, Button, Card, Field, StatusBadge, buttonClass, cx, formatDate, timeAgo } from '@/components/admin/ui';

function DocumentRow({ label, doc, optional }: { label: string; doc: DocumentMeta | null | undefined; optional?: boolean }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span
        className={cx(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md',
          doc ? 'bg-emerald-50 text-emerald-700' : optional ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600'
        )}
      >
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-900">
          {label}
          {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
        </div>
        {doc ? (
          <div className="truncate text-xs text-slate-500" title={doc.originalName}>
            {doc.originalName} · {(doc.size / 1024).toFixed(1)} KB
          </div>
        ) : (
          <div className={cx('text-xs', optional ? 'text-slate-400' : 'font-medium text-red-600')}>
            {optional ? 'Not provided' : 'Missing'}
          </div>
        )}
      </div>
      {doc && (
        <a
          href={`/api/admin/applications/documents/${doc.filename}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass('secondary', 'sm')}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </a>
      )}
    </li>
  );
}

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [app, setApp] = useState<IWholesaleApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [assignedSalesRep, setAssignedSalesRep] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/applications/${params.id}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await readJson(res);
      if (data.ok && data.application) {
        setApp(data.application);
        setAssignedSalesRep(data.application.assignedSalesRep || '');
        setAdminNotes(data.application.adminNotes || '');
      } else {
        setError(data.error || 'Application not found');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [params.id]);

  const handleSaveNotes = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/applications/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedSalesRep, adminNotes }),
      });
      const data = await readJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save notes');
      setSuccess('Internal notes and sales rep updated successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve ${app?.businessName}? This will create their wholesale account in Shopify.`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/applications/${params.id}/approve`, {
        method: 'POST',
      });
      const data = await readJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || 'Approval failed');

      setSuccess(data.message || 'Application approved and customer synced to Shopify!');
      fetchApplication();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/applications/${params.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await readJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || 'Rejection failed');

      setShowRejectModal(false);
      setSuccess('Application marked as rejected and email sent to applicant.');
      fetchApplication();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!app) return;
    const shopifyNote = app.shopifyCustomerId
      ? '\n\nTheir Shopify customer record is NOT deleted; remove it in Shopify Admin if needed.'
      : '';
    if (
      !window.confirm(
        `Permanently delete ${app.businessName} (${app.email})?\n\nThis removes the account, its login and all uploaded documents. It cannot be undone.${shopifyNote}`
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/applications/${params.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await readJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || 'Delete failed');
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
      setActionLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-24 rounded-lg bg-white border border-slate-200" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-lg bg-white border border-slate-200 lg:col-span-2" />
          <div className="h-80 rounded-lg bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h2 className="text-lg font-semibold text-slate-900">Application not found</h2>
        {error && <p className="mt-1 text-sm text-slate-500">{error}</p>}
        <Link href="/admin" className={buttonClass('secondary', 'md', 'mt-5')}>
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </Link>
      </div>
    );
  }

  const canDecide = app.status === 'PENDING' || app.status === 'NEEDS_INFO';
  const requiredDocs = [app.documents?.tobaccoLicense, app.documents?.salesTaxLicense, app.documents?.feinForm];
  const docsHave = requiredDocs.filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </Link>

      {/* Record header */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={app.businessName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{app.businessName}</h1>
                <StatusBadge status={app.status} size="md" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                {app.dba && <span>DBA {app.dba}</span>}
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {app.address.city}, {app.address.state}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Submitted {formatDate(app.createdAt)} ({timeAgo(app.createdAt)})
                </span>
              </div>
            </div>
          </div>

          {canDecide && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
                <XCircle className="h-4 w-4" />
                <span>Reject / request info</span>
              </Button>
              <Button variant="primary" onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Approve account</span>
              </Button>
            </div>
          )}
        </div>

        {/* Summary strip */}
        <dl className="grid grid-cols-2 divide-slate-100 border-t border-slate-100 sm:grid-cols-4 sm:divide-x">
          <div className="px-5 py-3 sm:px-6">
            <dt className="text-xs font-medium text-slate-500">Documents</dt>
            <dd className={cx('mt-0.5 text-sm font-semibold', docsHave === 3 ? 'text-emerald-700' : 'text-amber-700')}>
              {docsHave} of 3 required
            </dd>
          </div>
          <div className="px-5 py-3 sm:px-6">
            <dt className="text-xs font-medium text-slate-500">Sales rep</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">{app.assignedSalesRep || 'Unassigned'}</dd>
          </div>
          <div className="px-5 py-3 sm:px-6">
            <dt className="text-xs font-medium text-slate-500">Shopify customer</dt>
            <dd className="mt-0.5 truncate font-mono text-sm font-semibold text-slate-900">{app.shopifyCustomerId || '—'}</dd>
          </div>
          <div className="px-5 py-3 sm:px-6">
            <dt className="text-xs font-medium text-slate-500">Last reviewed</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {app.reviewedAt ? formatDate(app.reviewedAt) : 'Not yet'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}
      {app.status === 'REJECTED' && app.rejectionReason && (
        <div className="rounded-lg border border-red-200 bg-white p-4 text-sm">
          <div className="font-semibold text-red-800">Rejection reason sent to applicant</div>
          <p className="mt-1 whitespace-pre-line text-slate-700">{app.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="Business information" description="As submitted on the wholesale application">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field label="Contact email">
                <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 font-medium text-[#123f28] hover:underline">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {app.email}
                </a>
              </Field>
              <Field label="Business phone">
                {app.businessPhone ? (
                  <a href={`tel:${app.businessPhone}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {app.businessPhone}
                  </a>
                ) : (
                  <span className="text-slate-400">Not provided</span>
                )}
              </Field>
              <Field label="Business address">
                <address className="not-italic leading-relaxed">
                  {app.address.line1}
                  {app.address.line2 && <><br />{app.address.line2}</>}
                  <br />
                  {app.address.city}, {app.address.state} {app.address.postalCode}
                  <br />
                  {app.address.country}
                </address>
              </Field>
              <Field label="Billing address">
                {app.billing.sameAsBusiness ? (
                  <span className="text-slate-500">Same as business address</span>
                ) : (
                  <address className="not-italic leading-relaxed">
                    {app.billing.name && <><span className="font-medium">{app.billing.name}</span><br /></>}
                    {app.billing.line1}
                    {app.billing.line2 && <><br />{app.billing.line2}</>}
                    <br />
                    {app.billing.city}, {app.billing.state} {app.billing.postalCode}
                    <br />
                    {app.billing.country}
                  </address>
                )}
              </Field>
            </dl>
          </Card>

          <Card
            title="Compliance documents"
            description="Open each file and verify it on the state portal before approving"
            bodyClassName="p-0"
            actions={
              <span className={cx('text-xs font-semibold', docsHave === 3 ? 'text-emerald-700' : 'text-amber-700')}>
                {docsHave}/3 required
              </span>
            }
          >
            <ul className="divide-y divide-slate-100">
              <DocumentRow label="Tobacco license" doc={app.documents?.tobaccoLicense} />
              <DocumentRow label="Resale tax certificate" doc={app.documents?.salesTaxLicense} />
              <DocumentRow label="IRS EIN letter" doc={app.documents?.feinForm} />
              <DocumentRow label="Hemp retailer license" doc={app.documents?.hempLicense} optional />
            </ul>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card title="Account management" description="Only staff can see these fields">
            <div className="space-y-4">
              <div>
                <label htmlFor="sales-rep" className="mb-1.5 block text-xs font-medium text-slate-600">
                  Assigned sales representative
                </label>
                <input
                  id="sales-rep"
                  type="text"
                  value={assignedSalesRep}
                  onChange={(e) => setAssignedSalesRep(e.target.value)}
                  placeholder="e.g. John Doe (+1 267 902-1290)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#123f28] focus:outline-none focus:ring-1 focus:ring-[#123f28]"
                />
              </div>
              <div>
                <label htmlFor="admin-notes" className="mb-1.5 block text-xs font-medium text-slate-600">
                  Internal compliance notes
                </label>
                <textarea
                  id="admin-notes"
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="License verified on state portal, opening order expected…"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#123f28] focus:outline-none focus:ring-1 focus:ring-[#123f28]"
                />
              </div>
              <Button onClick={handleSaveNotes} disabled={actionLoading} className="w-full">
                <Save className="h-4 w-4" />
                <span>Save changes</span>
              </Button>
            </div>
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-slate-400" />Activity</span>}>
            <ol className="relative space-y-4 border-l border-slate-200 pl-5 text-sm">
              <li>
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
                <div className="font-medium text-slate-900">Application submitted</div>
                <div className="text-xs text-slate-500">{formatDate(app.createdAt, true)}</div>
              </li>
              {app.reviewedAt && (
                <li>
                  <span
                    className={cx(
                      'absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full',
                      app.status === 'APPROVED' ? 'bg-emerald-500' : app.status === 'REJECTED' ? 'bg-red-500' : 'bg-sky-500'
                    )}
                  />
                  <div className="font-medium text-slate-900">
                    {app.status === 'APPROVED' ? 'Approved' : app.status === 'REJECTED' ? 'Rejected' : 'Reviewed'}
                    {app.reviewedBy && <span className="font-normal text-slate-500"> by {app.reviewedBy}</span>}
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(app.reviewedAt, true)}</div>
                </li>
              )}
              {app.status === 'APPROVED' && app.shopifyCustomerId && (
                <li>
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-[#123f28]" />
                  <div className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-[#123f28]" />
                    Synced to Shopify
                  </div>
                  <div className="font-mono text-xs text-slate-500">Customer {app.shopifyCustomerId}</div>
                </li>
              )}
            </ol>
          </Card>

          <Card title={<span className="text-red-700">Danger zone</span>} className="border-red-200">
            <p className="text-sm text-slate-500">Permanently delete this account, its storefront login and uploaded documents.</p>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading} className="mt-4 w-full">
              <Trash2 className="h-4 w-4" />
              <span>Delete account</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* Rejection modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 id="reject-title" className="text-base font-semibold text-slate-900">
                Reject or request more info
              </h3>
              <p className="mt-1 text-sm text-slate-500">The applicant is emailed this explanation automatically.</p>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="px-6 py-4">
                <textarea
                  rows={5}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Your Pennsylvania Tobacco License appears to be expired. Please reply with your updated 2026 renewal certificate."
                  required
                  autoFocus
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-slate-100 bg-slate-50 px-6 py-3">
                <Button type="button" variant="ghost" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reject &amp; email applicant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
