// Shared formatting helpers — the ONLY place money/date display is formatted.

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Format a rupee amount stored in rupees (float) with paise. */
export function formatINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return inr.format(Number(amount));
}

/** Format without paise for headline figures. */
export function formatINRWhole(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return inrWhole.format(Number(amount));
}

/** Signed ledger amount: + ₹1,000.00 / − ₹250.50 */
export function formatSignedINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign} ${inr.format(Math.abs(n))}`;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d);
}

/** Mask an account number: 50100234567890 → •••• 7890 */
export function maskAccount(acc) {
  if (!acc) return '—';
  const s = String(acc).replace(/\s/g, '');
  return `•••• ${s.slice(-4)}`;
}

/** Mask a PAN: ABCDE1234F → ABC••1234F */
export function maskPan(pan) {
  if (!pan) return '—';
  const s = String(pan).toUpperCase();
  if (s.includes('••')) return s;
  if (s.length < 7) return s;
  return `${s.slice(0, 3)}••${s.slice(5)}`;
}

/** Mask a card number the same way as an account. */
export const maskCard = maskAccount;

/** Human label for a status enum: UNDER_REVIEW → Under Review */
export function statusLabel(status) {
  if (!status) return '—';
  return String(status)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Human title for a product slug: 'vehicle-loan' → 'Vehicle Loan' (also handles 'vehicle_loan'). */
export function titleizeSlug(slug) {
  if (!slug) return '';
  return String(slug)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Display name for an application/loan record — the stored product name when
 * present, otherwise a titleized slug, so a raw slug is never rendered.
 */
export function productDisplayName(record) {
  if (!record) return '';
  return record.productName || titleizeSlug(record.productSlug || record.productId) || '';
}

/** Listing-card name: strip the leading brand prefix ('FinEdge Home Loan' → 'Home Loan'). */
export function shortProductName(name) {
  if (!name) return '';
  return String(name).replace(/^FinEdge\s+/, '');
}

/** Age of a case for queues: "2d 06h" */
export function ageOf(iso, now = new Date()) {
  if (!iso) return '—';
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return '—';
  const mins = Math.max(0, Math.floor((now.getTime() - start) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}
