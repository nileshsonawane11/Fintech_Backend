import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings2, ShieldCheck, User } from 'lucide-react';
import {
  Button, Card, Checkbox, Field, FormError, Input, PageLoading,
  SectionHeader, Select, StatusChip, useToast,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { formatDate, formatDateTime, maskPan } from '../../../lib/format.js';
import { getMyKyc } from '../../../services/portalBridge.js';
import { changePassword } from '../../../services/portalBridge.js';
import { traceForm } from '../../../lib/trace.js';

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
    else if (pw.next.length < 10 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(pw.next)) next.next = 'New password must be at least 10 characters with uppercase, lowercase, and a number.';
    else if (pw.next === pw.current) next.next = 'The new password must be different from the current one.';
    if (!pw.confirm) next.confirm = 'Re-enter the new password.';
    else if (pw.next && pw.confirm !== pw.next) next.confirm = 'The new passwords do not match.';
    setPwErrors(next);
    if (Object.keys(next).length) return;

    // Module 50: Trace password change form
    traceForm('PasswordChange', {
      currentPassword: pw.current,
      nextPassword: pw.next,
      confirmPassword: pw.confirm
    });

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
    // Module 50: Trace preferences update
    traceForm('ProfilePreferencesUpdate', prefs);

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
      <SectionHeader
        title="Profile & Settings"
        subtitle="Review your registered personal details, update security credentials, and manage device preferences."
      />

      {loadError && <FormError message={loadError} />}

      {/* Identity Summary Card */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-midnight-900 font-display text-xl font-bold text-porcelain-100 ring-4 ring-midnight-100">
              {initials}
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-midnight-950">{displayName}</h2>
              <p className="font-mono text-xs text-ink-500">Customer ID: {customerId || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip status={customer?.kycStatus || 'VERIFIED'} />
          </div>
        </div>
      </Card>

      {/* KYC & Personal Details */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
          <User className="h-5 w-5 text-midnight-700" aria-hidden /> Registered Details
        </h3>
        <dl className="divide-y divide-ink-100">
          <Row label="Full legal name">{customer?.fullName || user?.name}</Row>
          <Row label="Date of birth">{customer?.dateOfBirth ? formatDate(customer.dateOfBirth) : '—'}</Row>
          <Row label="Primary email">{customer?.email || user?.email}</Row>
          <Row label="Registered mobile">{customer?.mobileNumber || user?.mobileNumber}</Row>
          <Row label="PAN">{customer?.panNumber ? maskPan(customer.panNumber) : '—'}</Row>
          <Row label="Aadhaar status">{customer?.aadhaarNumber ? 'Verified (via OTP)' : 'Not linked'}</Row>
          <Row label="Registered address">{addressText || '—'}</Row>
          <Row label="Last signed in">{lastLogin ? formatDateTime(lastLogin) : '—'}</Row>
        </dl>
      </Card>

      {/* Security Credentials */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
          <ShieldCheck className="h-5 w-5 text-midnight-700" aria-hidden /> Change NetBanking Password
        </h3>
        <p className="mb-4 text-xs text-ink-500">
          Passwords must be at least 10 characters long, containing uppercase, lowercase, and numeric characters.
        </p>

        {pwFormError && <div className="mb-4"><FormError message={pwFormError} /></div>}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <Field label="Current Password" error={pwErrors.current} required>
            <Input
              type="password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              placeholder="Enter current password"
            />
          </Field>
          <Field label="New Password" error={pwErrors.next} required>
            <Input
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              placeholder="Enter new strong password"
            />
          </Field>
          <Field label="Confirm New Password" error={pwErrors.confirm} required>
            <Input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Re-enter new password"
            />
          </Field>
          <Button type="submit" loading={pwSaving}>Update Password</Button>
        </form>
      </Card>

      {/* Device & Notification Preferences */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
          <Settings2 className="h-5 w-5 text-midnight-700" aria-hidden /> Statement &amp; Alerts Preferences
        </h3>
        <p className="mb-4 text-xs text-ink-500">
          Preferences apply to this browser and device only.
        </p>
        <form onSubmit={handleSavePrefs} className="space-y-4 max-w-md">
          <Field label="Default statement format">
            <Select
              value={prefs.statementFormat}
              onChange={(e) => setPref('statementFormat', e.target.value)}
              options={[
                { value: 'PDF', label: 'PDF format (printable summary)' },
                { value: 'CSV', label: 'CSV format (spreadsheet)' },
              ]}
            />
          </Field>
          <div className="space-y-2">
            <Checkbox label="Email transaction alerts and monthly statements" checked={!!prefs.emailAlerts} onChange={(e) => setPref('emailAlerts', e.target.checked)} />
            <Checkbox label="SMS alerts for account and application updates" checked={!!prefs.smsAlerts} onChange={(e) => setPref('smsAlerts', e.target.checked)} />
            <Checkbox label="Instant transaction alerts (debits and credits)" checked={!!prefs.transactionAlerts} onChange={(e) => setPref('transactionAlerts', e.target.checked)} />
            <Checkbox label="Product offers and rate updates" checked={!!prefs.productOffers} onChange={(e) => setPref('productOffers', e.target.checked)} />
          </div>
          <Button type="submit" loading={prefsSaving}>Save preferences</Button>
        </form>
      </Card>

      <div className="flex justify-end">
        <Button variant="danger" onClick={handleLogout} loading={loggingOut}>
          <LogOut className="h-4 w-4" aria-hidden /> Logout
        </Button>
      </div>
    </div>
  );
}
