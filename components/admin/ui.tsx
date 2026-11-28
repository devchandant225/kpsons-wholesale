import React from 'react';
import { CheckCircle2, Clock, XCircle, HelpCircle } from 'lucide-react';
import { ApplicationStatus } from '@/types';

// Shared building blocks for the admin console, so every page looks the same.

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const STATUS_STYLES: Record<ApplicationStatus, { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: 'Pending review', className: 'bg-amber-50 text-amber-800 ring-amber-600/20', Icon: Clock },
  NEEDS_INFO: { label: 'Needs info', className: 'bg-sky-50 text-sky-800 ring-sky-600/20', Icon: HelpCircle },
  APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-800 ring-red-600/20', Icon: XCircle },
};

export function statusLabel(status: ApplicationStatus) {
  return STATUS_STYLES[status]?.label || status;
}

export function StatusBadge({ status, size = 'sm' }: { status: ApplicationStatus; size?: 'sm' | 'md' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md font-semibold ring-1 ring-inset whitespace-nowrap',
        size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        s.className
      )}
    >
      <s.Icon className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {s.label}
    </span>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx('bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-xs font-medium text-slate-500">{eyebrow}</div>}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'slate',
  active,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: typeof Clock;
  tone?: 'slate' | 'amber' | 'emerald' | 'red' | 'sky';
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'text-left w-full bg-white rounded-lg border p-4 sm:p-5 transition shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        active ? 'border-[#123f28] ring-1 ring-[#123f28]' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={cx('inline-flex items-center justify-center w-8 h-8 rounded-md', tones[tone])}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </button>
  );
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function buttonClass(
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'secondary',
  size: 'sm' | 'md' = 'md',
  className?: string
) {
  const variants = {
    primary: 'bg-[#123f28] text-white hover:bg-[#0b2a1a] shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm',
    danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return cx(
    'inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#123f28]/40',
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
    variants[variant],
    className
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 break-words">{children}</dd>
    </div>
  );
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex flex-shrink-0 items-center justify-center rounded-md bg-[#123f28]/10 text-[#123f28] font-semibold',
        size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs'
      )}
    >
      {initials(name)}
    </span>
  );
}

export function formatDate(value: Date | string | undefined, withTime = false) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return withTime
    ? d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function timeAgo(value: Date | string | undefined) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
}
