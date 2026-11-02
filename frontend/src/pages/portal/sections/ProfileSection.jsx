import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RotateCcw, Settings2, ShieldCheck, User } from 'lucide-react';
import {
  Button, Card, Checkbox, Field, FormError, Input, Modal, PageLoading,
  SectionHeader, Select, StatusChip, useToast,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { formatDate, formatDateTime, maskPan } from '../../../lib/format.js';
import { getMyKyc } from '../../../services/portalBridge.js';
import { changePassword } from '../../../services/portalBridge.js';
import { resetDemoData } from '../../../services/portalBridge.js';

const PREFS_KEY = 'finedge-prefs';

const DEFAULT_PREFS = {
  statementFormat: 'PDF',
  emailAlerts: true,
  smsAlerts: false,
  transactionAlerts: true,
  productOffers: false,
};

function loadPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* storage unavailable — defaults apply */ }
  return { ...DEFAULT_PREFS };
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-50 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-[13px] font-medium text-ink-500">{label}</dt>
      <dd className="text-sm font-medium text-ink-900">{children || '—'}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  useDbTick();
  const { toast } = useToast();
  const navigate = useNavigate();
  const customerId = user?.customerId;

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwFormError, setPwFormError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [prefs, setPrefs] = useState(loadPrefs);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (!customerId) { setLoading(false); return undefined; }
    let live = true;
    getMyKyc(customerId)
      .then((res) => { if (live) { setCustomer(res.customer); setLoadError(''); } })
      .catch((err) => { if (live) setLoadError(err?.message || 'We could not load your profile.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [customerId]);

  if (loading) return <PageLoading />;

  const displayName = customer?.fullName || user?.name || '—';
  const initials = displayName !== '—'
    ? displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const addressText = customer?.address
    ? [customer.address.line1, customer.address.line2, customer.address.city, customer.address.state, customer.address.pin].filter(Boolean).join(', ')
    : '';
  const lastLogin = user?.lastLogin || user?.lastLoginAt;

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!pw.current) next.current = 'Enter your current password.';
    if (!pw.next) next.next = 'Enter a new password.';
    else if (pw.next.length < 8) next.next = 'Use at least 8 characters for the new password.';
    else if (pw.next === pw.current) next.next = 'The new password must be different from the current one.';
    if (!pw.confirm) next.confirm = 'Re-enter the new password.';
    else if (pw.next && pw.confirm !== pw.next) next.confirm = 'The new passwords do not match.';
    setPwErrors(next);
    if (Object.keys(next).length) return;
    setPwSaving(true);
    setPwFormError('');
    try {
      await changePassword(user.id, pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      toast({ title: 'Password changed', body: 'Use the new password the next time you sign in.' });
    } catch (err) {
      setPwFormError(err?.message || 'We could not change your password. Please try again.');
    } finally {
      setPwSaving(false);
    }
  }

  function handleSavePrefs(e) {
    e.preventDefault();
    setPrefsSaving(true);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      toast({ title: 'Preferences saved', body: 'Your statement and notification preferences have been updated on this device.' });
    } catch {
      toast({ tone: 'error', title: 'Could not save preferences', body: 'Storage is unavailable in this browser session.' });
    } finally {
      setPrefsSaving(false);
    }
  }

  function handleResetConfirm() {
    // Clears every app-owned storage key and reloads, so the store
    // re-seeds the original demo dataset; the reload signs the user out.
    resetDemoData();
    navigate('/');
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  }

  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      <SectionHeader titleAs="h1" eyebrow="Profile" title="My profile" description="Your personal details, sign-in security and communication preferences." />
      <FormError message={loadError} />

      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-midnight-800 font-display text-lg font-semibold text-porcelain-50" aria-hidden>
            {initials}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold text-midnight-950">{displayName}</h3>
            <p className="tnum mt-0.5 text-sm text-ink-600">Customer ID: {customerId || '—'}</p>
            <p className="mt-0.5 text-sm text-ink-600">PAN: {maskPan(customer?.pan)}</p>
          </div>
          {customer?.kycStatus && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[13px] font-medium text-ink-500">KYC</span>
              <StatusChip status={customer.kycStatus} />
            </div>
          )}
        </div>
      </Card>

      {/* Personal details */}
      <Card className="p-5">
        <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
          <User className="h-5 w-5 text-midnight-700" aria-hidden /> Personal details
        </h3>
        <dl>
          <Row label="Full name">{customer?.fullName || '—'}</Row>
          <Row label="Email">{customer?.email || user?.email || '—'}</Row>
          <Row label="Mobile">{customer?.mobile || '—'}</Row>
          <Row label="Date of birth">{customer?.dob ? formatDate(customer.dob) : '—'}</Row>
          <Row label="Address">{addressText || '—'}</Row>
          <Row label="Occupation">{customer?.occupation || '—'}</Row>
        </dl>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
          To correct any of these details, update them from the KYC page — changes there go through officer review.
        </p>
      </Card>

      {/* Security & sessions */}
      <Card className="p-5">
        <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
          <ShieldCheck className="h-5 w-5 text-midnight-700" aria-hidden /> Security &amp; sessions
        </h3>
        <dl>
          <Row label="Last sign-in">{lastLogin ? formatDateTime(lastLogin) : '—'}</Row>
          <Row label="Sign-in email">{user?.email || '—'}</Row>
        </dl>

        <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4 border-t border-ink-100 pt-5" noValidate>
          <p className="text-sm font-semibold text-ink-900">Change password</p>
          <FormError message={pwFormError} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password" required error={pwErrors.current}>
              <Input
                type="password" autoComplete="current-password" value={pw.current}
                onChange={(e) => { setPw((p) => ({ ...p, current: e.target.value })); setPwErrors((x) => ({ ...x, current: undefined })); }}
                error={pwErrors.current}
              />
            </Field>
            <Field label="New password" required error={pwErrors.next} hint="At least 8 characters">
              <Input
                type="password" autoComplete="new-password" value={pw.next}
                onChange={(e) => { setPw((p) => ({ ...p, next: e.target.value })); setPwErrors((x) => ({ ...x, next: undefined })); }}
                error={pwErrors.next}
              />
            </Field>
            <Field label="Confirm new password" required error={pwErrors.confirm}>
              <Input
                type="password" autoComplete="new-password" value={pw.confirm}
                onChange={(e) => { setPw((p) => ({ ...p, confirm: e.target.value })); setPwErrors((x) => ({ ...x, confirm: undefined })); }}
                error={pwErrors.confirm}
              />
            </Field>
          </div>
          <Button type="submit" loading={pwSaving}>Change password</Button>
        </form>
      </Card>

      {/* Preferences */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
          <Settings2 className="h-5 w-5 text-midnight-700" aria-hidden /> Preferences
        </h3>
        <p className="text-sm leading-relaxed text-ink-600">Preferences are stored on this device and apply to this portal.</p>
        <form onSubmit={handleSavePrefs} className="mt-4 space-y-4">
          <div className="max-w-sm">
            <Field label="Statement format">
              <Select value={prefs.statementFormat} onChange={(e) => setPref('statementFormat', e.target.value)}>
                <option value="PDF">PDF</option>
                <option value="CSV">CSV</option>
                <option value="XLSX">Excel (XLSX)</option>
              </Select>
            </Field>
          </div>
          <div className="space-y-3">
            <Checkbox label="Email alerts for account and application updates" checked={!!prefs.emailAlerts} onChange={(e) => setPref('emailAlerts', e.target.checked)} />
            <Checkbox label="SMS alerts for account and application updates" checked={!!prefs.smsAlerts} onChange={(e) => setPref('smsAlerts', e.target.checked)} />
            <Checkbox label="Instant transaction alerts (debits and credits)" checked={!!prefs.transactionAlerts} onChange={(e) => setPref('transactionAlerts', e.target.checked)} />
            <Checkbox label="Product offers and rate updates" checked={!!prefs.productOffers} onChange={(e) => setPref('productOffers', e.target.checked)} />
          </div>
          <Button type="submit" loading={prefsSaving}>Save preferences</Button>
        </form>
      </Card>

      {/* Demo data */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
          <RotateCcw className="h-5 w-5 text-midnight-700" aria-hidden /> Demo data
        </h3>
        <p className="text-sm leading-relaxed text-ink-600">
          This prototype stores its data in your browser, not on a server. Resetting restores the original
          seeded demo dataset, so you can run every workflow again from a clean start.
        </p>
        <div className="mt-4">
          <Button variant="danger" onClick={() => setResetOpen(true)}>Reset demo data</Button>
        </div>
      </Card>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data?"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleResetConfirm}>Reset demo data</Button>
          </>
        )}
      >
        <p className="text-sm leading-relaxed text-ink-700">
          This clears everything this prototype has stored in your browser — accounts, applications,
          transfers, KYC decisions and preferences — and restores the original seeded demo data.
          You will be signed out, and the reset cannot be undone.
        </p>
      </Modal>

      <div className="flex justify-end">
        <Button variant="danger" onClick={handleLogout} loading={loggingOut}>
          <LogOut className="h-4 w-4" aria-hidden /> Logout
        </Button>
      </div>
    </div>
  );
}
