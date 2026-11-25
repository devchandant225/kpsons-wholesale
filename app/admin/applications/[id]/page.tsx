'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Loader2,
  Save,
  Trash2
} from 'lucide-react';
import { IWholesaleApplication } from '@/types';
import { readJson } from '@/lib/read-json';

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
      <div className="py-20 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#123f28] mb-2" />
        <span>Loading application details…</span>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Application Not Found</h2>
        <Link href="/admin" className="text-[#123f28] font-semibold text-sm mt-4 inline-block hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Applications</span>
        </Link>

        {/* Approval / Rejection Action Buttons */}
        <div className="flex items-center gap-3">
          {app.status === 'PENDING' && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="bg-white border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-60 flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject / Request Info</span>
              </button>

              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-[#123f28] hover:bg-[#0b2a1a] text-white px-5 py-2 rounded-lg text-sm font-bold transition shadow-md disabled:opacity-60 flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Approve Wholesale Account</span>
              </button>
            </>
          )}

          {app.status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-lg text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Approved &amp; Active</span>
            </span>
          )}

          {app.status === 'REJECTED' && (
            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-3.5 py-1.5 rounded-lg text-sm font-bold">
              <XCircle className="w-4 h-4" />
              <span>Rejected</span>
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid: Details (Left) + Documents & Notes (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Business & Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <span>{app.businessName}</span>
                </h2>
                {app.dba && <p className="text-xs text-slate-400 mt-0.5">DBA: {app.dba}</p>}
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  app.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : app.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {app.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Contact Email</label>
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${app.email}`} className="text-[#123f28] hover:underline">
                    {app.email}
                  </a>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Business Phone</label>
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{app.businessPhone || 'Not provided'}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Physical Business Address</label>
                <div className="text-sm text-slate-700 leading-relaxed flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{app.address.line1}</p>
                    {app.address.line2 && <p>{app.address.line2}</p>}
                    <p>
                      {app.address.city}, {app.address.state} {app.address.postalCode}
                    </p>
                    <p>{app.address.country}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Billing Address</label>
                <div className="text-sm text-slate-700 leading-relaxed">
                  {app.billing.sameAsBusiness ? (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      Same as physical business address
                    </span>
                  ) : (
                    <div>
                      {app.billing.name && <p className="font-semibold">{app.billing.name}</p>}
                      <p>{app.billing.line1}</p>
                      {app.billing.line2 && <p>{app.billing.line2}</p>}
                      <p>
                        {app.billing.city}, {app.billing.state} {app.billing.postalCode}
                      </p>
                      <p>{app.billing.country}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shopify Info */}
            {app.shopifyCustomerId && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Shopify Customer ID:</span>
                <span className="font-mono font-bold text-slate-800">{app.shopifyCustomerId}</span>
              </div>
            )}
          </div>

          {/* Submitted Document Files Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              <span>Compliance Documents &amp; Licenses</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tobacco License */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Tobacco License</span>
                  {app.documents?.tobaccoLicense ? (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                        {app.documents.tobaccoLicense.originalName}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {(app.documents.tobaccoLicense.size / 1024).toFixed(1)} KB &bull; {app.documents.tobaccoLicense.mimetype}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-red-500 font-semibold mt-1">Not uploaded</p>
                  )}
                </div>

                {app.documents?.tobaccoLicense && (
                  <a
                    href={`/api/admin/applications/documents/${app.documents.tobaccoLicense.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-[#123f28] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-[#0b2a1a] transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </a>
                )}
              </div>

              {/* Sales Tax License */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Resale Tax Certificate</span>
                  {app.documents?.salesTaxLicense ? (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                        {app.documents.salesTaxLicense.originalName}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {(app.documents.salesTaxLicense.size / 1024).toFixed(1)} KB &bull; {app.documents.salesTaxLicense.mimetype}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-red-500 font-semibold mt-1">Not uploaded</p>
                  )}
                </div>

                {app.documents?.salesTaxLicense && (
                  <a
                    href={`/api/admin/applications/documents/${app.documents.salesTaxLicense.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-[#123f28] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-[#0b2a1a] transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </a>
                )}
              </div>

              {/* FEIN Assignment */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">IRS EIN Letter</span>
                  {app.documents?.feinForm ? (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                        {app.documents.feinForm.originalName}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {(app.documents.feinForm.size / 1024).toFixed(1)} KB &bull; {app.documents.feinForm.mimetype}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-red-500 font-semibold mt-1">Not uploaded</p>
                  )}
                </div>

                {app.documents?.feinForm && (
                  <a
                    href={`/api/admin/applications/documents/${app.documents.feinForm.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-[#123f28] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-[#0b2a1a] transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </a>
                )}
              </div>

              {/* Optional Hemp License */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Hemp Retailer License</span>
                  {app.documents?.hempLicense ? (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                        {app.documents.hempLicense.originalName}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {(app.documents.hempLicense.size / 1024).toFixed(1)} KB &bull; {app.documents.hempLicense.mimetype}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Not required / omitted</p>
                  )}
                </div>

                {app.documents?.hempLicense && (
                  <a
                    href={`/api/admin/applications/documents/${app.documents.hempLicense.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-[#123f28] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-[#0b2a1a] transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sales Rep Assignment & Internal Notes */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Account Management</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Sales Representative</label>
              <input
                type="text"
                value={assignedSalesRep}
                onChange={(e) => setAssignedSalesRep(e.target.value)}
                placeholder="e.g. John Doe (+1 267 902-1290)"
                className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#123f28]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Internal Compliance Notes</label>
              <textarea
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="License verified on state portal, opening order expected..."
                className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#123f28]"
              />
            </div>

            <button
              onClick={handleSaveNotes}
              disabled={actionLoading}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>Save Notes</span>
            </button>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-700">Danger Zone</h3>
            <p className="text-xs text-slate-500">
              Permanently delete this account, its storefront login and uploaded documents.
            </p>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="w-full bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>

          {/* Audit trail */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-xs text-slate-500 space-y-2">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider">Audit Log</h4>
            <p>
              <strong>Submitted:</strong> {new Date(app.createdAt).toLocaleString()}
            </p>
            {app.reviewedBy && (
              <p>
                <strong>Reviewed By:</strong> {app.reviewedBy}
              </p>
            )}
            {app.reviewedAt && (
              <p>
                <strong>Reviewed On:</strong> {new Date(app.reviewedAt).toLocaleString()}
              </p>
            )}
            {app.rejectionReason && (
              <p className="text-red-600">
                <strong>Rejection Reason:</strong> {app.rejectionReason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reject / Request More Info</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the reason below. An email will automatically be sent to the applicant with this explanation.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Your Pennsylvania Tobacco License appears to be expired. Please reply with your updated 2026 renewal certificate."
                required
                className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Rejection &amp; Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
