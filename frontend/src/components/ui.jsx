// FinEdge shared primitives — every screen builds from these.
// No page should hand-roll a button, input, modal, toast or empty state.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import { statusLabel } from '../lib/format.js';

/* ---------------- Button ---------------- */

const BTN_VARIANTS = {
  primary: 'bg-midnight-900 text-porcelain-50 shadow-sm hover:bg-midnight-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
  porcelain: 'bg-porcelain-50 text-midnight-950 border border-transparent shadow-sm hover:bg-porcelain-200 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
  brass: 'bg-porcelain-50 text-midnight-950 border border-transparent shadow-sm hover:bg-porcelain-200 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
  secondary: 'bg-white text-midnight-900 border border-line hover:border-midnight-400 hover:text-midnight-900 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
  outline: 'bg-white text-midnight-900 border border-line hover:border-midnight-400 hover:text-midnight-900 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
  danger: 'bg-white text-danger-600 border border-danger-600/40 hover:bg-danger-50 focus-visible:ring-2 focus-visible:ring-danger-600 focus-visible:ring-offset-2',
  ghost: 'text-midnight-800 hover:bg-midnight-50 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
};

export function Button({ as: Component = 'button', variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }) {
  const sizes = { sm: 'min-h-9 px-4 text-xs', md: 'min-h-11 px-5 text-sm', lg: 'min-h-12 px-6 text-sm' };
  return (
    <Component
      className={`inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition-[color,background-color,border-color,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${BTN_VARIANTS[variant] || BTN_VARIANTS.primary} ${className}`}
      disabled={Component === 'button' ? (disabled || loading) : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </Component>
  );
}

export function Spinner({ className = 'h-5 w-5 text-midnight-700' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24" role="status">
      <Spinner className="h-8 w-8 text-midnight-700" />
    </div>
  );
}

/* ---------------- Forms ---------------- */

export function Field({ label, error, hint, children, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
        {label}
        {required && <span className="text-danger-600"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-danger-600" role="alert">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {error}
        </span>
      )}
    </label>
  );
}

const inputCls = (error) =>
  `w-full h-[42px] rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition-colors ${
    error ? 'border-danger-600 focus:border-danger-600 focus:ring-1 focus:ring-danger-600' : 'border-line hover:border-ink-300 focus:border-midnight-600 focus:ring-1 focus:ring-midnight-600'
  } outline-none`;

export function Input({ error, className = '', ...props }) {
  return <input className={`${inputCls(error)} ${className}`} aria-invalid={!!error} {...props} />;
}

export function Textarea({ error, className = '', ...props }) {
  return <textarea className={`${inputCls(error)} h-auto min-h-[96px] py-2.5 ${className}`} aria-invalid={!!error} {...props} />;
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select className={`${inputCls(error)} ${className}`} aria-invalid={!!error} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, error, ...props }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-midnight-800" {...props} />
      <span>
        {label}
        {error && <span className="mt-0.5 block text-xs font-medium text-danger-600" role="alert">{error}</span>}
      </span>
    </label>
  );
}

/** Inline form-level error banner (server/flow failures). */
export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger-600/30 bg-danger-50 px-3 py-2.5 text-sm text-danger-600" role="alert">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

/* ---------------- Surfaces ---------------- */

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-xl border border-line bg-white shadow-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description, action, titleAs: TitleTag = 'h2' }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold-700">{eyebrow}</p>}
        <TitleTag className="font-display text-2xl font-semibold text-midnight-950 sm:text-3xl">{title}</TitleTag>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Status ---------------- */

const STATUS_TONES = {
  success: ['APPROVED', 'ACTIVE', 'VERIFIED', 'SUCCESS', 'ISSUED', 'DISBURSED', 'RESOLVED', 'COMPLETED', 'OPEN_ACCOUNT'],
  warning: ['PENDING', 'UNDER_REVIEW', 'DOCUMENT_VERIFICATION', 'INFO_REQUIRED', 'IN_PROGRESS', 'SUBMITTED', 'PENDING_AUTHORIZATION'],
  danger: ['REJECTED', 'DECLINED', 'FAILED', 'BLOCKED', 'DENIED'],
  info: ['OPEN', 'NOT_STARTED'],
};

export function statusTone(status) {
  const s = String(status || '').toUpperCase();
  for (const [tone, list] of Object.entries(STATUS_TONES)) if (list.includes(s)) return tone;
  return 'neutral';
}

const TONE_CLS = {
  success: 'bg-success-50 text-success-600 border-success-600/25',
  warning: 'bg-warning-50 text-warning-600 border-warning-600/25',
  danger: 'bg-danger-50 text-danger-600 border-danger-600/25',
  info: 'bg-midnight-50 text-midnight-700 border-midnight-200',
  neutral: 'bg-ink-50 text-ink-600 border-ink-200',
};

export function StatusChip({ status, className = '' }) {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_CLS[tone]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

export function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_CLS[tone] || TONE_CLS.neutral} ${className}`}>
      {children}
    </span>
  );
}

/* ---------------- Empty states ---------------- */

export function EmptyState({ icon: Icon, title, body, action, variant = 'empty' }) {
  return (
    <div className={`rounded-xl border border-dashed px-6 py-10 text-center ${variant === 'error' ? 'border-danger-600/40 bg-danger-50/50' : 'border-ink-200 bg-porcelain-50'}`}>
      {Icon && (
        <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full ${variant === 'error' ? 'bg-danger-50 text-danger-600' : 'bg-midnight-50 text-midnight-700'}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ink-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------- Table ---------------- */

export function Table({ columns, rows, rowKey, onRowClick, empty, minWidthClass = 'min-w-[640px]' }) {
  if (!rows || rows.length === 0) return empty || null;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
      <table className={`w-full ${minWidthClass} border-collapse text-left text-sm`}>
        <thead>
          <tr className="border-b border-line bg-porcelain-100/70">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-line last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-midnight-50/60' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 align-top text-ink-800 ${c.align === 'right' ? 'text-right tnum' : ''} ${c.className || ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
            active === t.id ? 'border-gold-500 text-midnight-900' : 'border-transparent text-ink-500 hover:text-midnight-800'
          }`}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold ${active === t.id ? 'bg-gold-100 text-gold-700' : 'bg-ink-100 text-ink-600'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Stepper ---------------- */

export function Stepper({ steps }) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex flex-1 gap-3 pb-5 last:pb-0 sm:flex-col sm:gap-0 sm:pb-0">
          {i < steps.length - 1 && (
            <>
              <span className={`absolute left-3.5 top-7 h-[calc(100%-24px)] w-0.5 sm:hidden ${step.state === 'done' ? 'bg-midnight-600' : 'bg-line'}`} aria-hidden />
              <span className={`absolute left-7 top-3.5 hidden h-0.5 w-[calc(100%-28px)] sm:block ${step.state === 'done' ? 'bg-midnight-600' : 'bg-line'}`} aria-hidden />
            </>
          )}
          <span
            className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
              step.state === 'done'
                ? 'border-midnight-700 bg-midnight-700 text-white'
                : step.state === 'current'
                  ? 'border-gold-500 bg-gold-50 text-gold-700'
                  : 'border-line bg-white text-ink-400'
            }`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            {step.state === 'done' ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
          </span>
          <span className="sm:mt-2 sm:pr-3">
            <span className={`block text-[13px] font-semibold ${step.state === 'upcoming' ? 'text-ink-400' : 'text-ink-800'}`}>{step.label}</span>
            {step.date && <span className="block text-xs text-ink-500">{step.date}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const el = ref.current;
    const focusables = el?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables?.length) focusables[0].focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade-in absolute inset-0 bg-midnight-950/60" onClick={onClose} aria-hidden />
      <div ref={ref} className={`animate-scale-in relative flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-modal sm:rounded-2xl ${wide ? 'max-w-[720px]' : 'max-w-md'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-base font-semibold text-midnight-950">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800 transition-colors" aria-label="Close">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 border-t border-line bg-white px-6 py-4 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Toast ---------------- */

const ToastCtx = createContext(null);
let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((toast) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, tone: 'success', ...toast }]);
    if (toast.tone !== 'error') {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    }
  }, []);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const toneCls = {
    success: 'border-success-600/30 text-success-600',
    error: 'border-danger-600/30 text-danger-600',
    info: 'border-midnight-300 text-midnight-700',
  };
  return (
    <ToastCtx.Provider value={{ toast: push }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.tone] || Info;
          return (
            <div key={t.id} className={`animate-slide-in-right pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 shadow-raised ${toneCls[t.tone] || toneCls.info}`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-sm font-semibold text-ink-900">{t.title}</p>}
                {t.body && <p className="text-[13px] leading-snug text-ink-600">{t.body}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-ink-400 hover:text-ink-700" aria-label="Dismiss">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/* ---------------- OTP input ---------------- */

export function OtpInput({ length = 6, value, onChange, onComplete, error }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value?.[i] || '');

  const setDigit = (i, ch) => {
    const next = [...digits];
    next[i] = ch;
    const joined = next.join('');
    onChange(joined);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
    if (joined.length === length && !next.includes('')) onComplete?.(joined);
  };

  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="One-time code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            maxLength={1}
            onChange={(e) => {
              const ch = e.target.value.replace(/\D/g, '').slice(-1);
              setDigit(i, ch);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) {
                refs.current[i - 1]?.focus();
                setDigit(i - 1, '');
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
              if (!text) return;
              const next = Array.from({ length }, (_, j) => text[j] || digits[j] || '');
              const joined = next.join('');
              onChange(joined);
              refs.current[Math.min(text.length, length - 1)]?.focus();
              if (joined.length === length && !next.includes('')) onComplete?.(joined);
            }}
            className={`h-12 w-full min-w-0 rounded-lg border bg-white text-center text-lg font-semibold text-ink-900 outline-none transition-colors ${
              error ? 'border-danger-600' : 'border-ink-200 focus:border-midnight-600'
            }`}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-danger-600" role="alert">{error}</p>}
    </div>
  );
}

/** Resend row with countdown — used under every OtpInput. */
export function ResendOtp({ onResend, seconds = 30 }) {
  const [left, setLeft] = useState(seconds);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <p className="text-[13px] text-ink-500">
      Didn’t receive the code?{' '}
      {left > 0 ? (
        <span>Resend in 0:{String(left).padStart(2, '0')}</span>
      ) : count >= 3 ? (
        <span>Please contact support or try again later.</span>
      ) : (
        <button
          type="button"
          className="font-semibold text-midnight-800 underline decoration-gold-400 decoration-2 underline-offset-2 hover:text-midnight-600"
          onClick={() => { setCount((c) => c + 1); setLeft(seconds); onResend?.(); }}
        >
          Resend code
        </button>
      )}
    </p>
  );
}
