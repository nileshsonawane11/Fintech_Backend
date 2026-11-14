import { useServerMode } from '../../lib/serverMode.js';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight, ChevronDown, KeyRound, Info } from 'lucide-react';
import { Button, Card, Field, FormError, Input, Modal, Select } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';
import { getFirstQueueForRole, hasSectionAccess } from '../../services/managerBridge.js';
import { resetDemoDb, getDemoStaffAccounts } from '../../services/api.js';
import { traceForm } from '../../lib/trace.js';


const STAFF_ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'System Administrator' },
  { value: 'BANK_MANAGER', label: 'Branch Manager' },
  { value: 'KYC_OFFICER', label: 'KYC Verification Officer' },
  { value: 'ACCOUNT_OPS', label: 'Account & Card Operations' },
  { value: 'AUDIT_COMPLIANCE', label: 'Audit & Compliance' },
  { value: 'CUSTOMER_SUPPORT', label: 'Customer Support' },
];

export const ManagerLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { managerLogin } = useAuth();
  const { isDemo } = useServerMode();
  const [demoOpen, setDemoOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const handleResetConfirm = () => {
    resetDemoDb();
    setResetOpen(false);
    setUserHasTyped(false);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const [role, setRole] = useState('');
  const [roleError, setRoleError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userHasTyped, setUserHasTyped] = useState(false);

  const handleSubmit = async (e, overrideValues) => {
    if (e?.preventDefault) e.preventDefault();
    if (loading) return;
    setError('');
    setRoleError('');

    const targetRole = overrideValues?.role !== undefined ? overrideValues.role : role;
    const targetEmail = overrideValues?.email !== undefined ? overrideValues.email : email;
    const targetPassword = overrideValues?.password !== undefined ? overrideValues.password : password;

    if (!targetRole) {
      setRoleError('Select the role you are signing in as.');
      return;
    }

    const trimmed = (targetEmail || '').trim();
    if (!trimmed) {
      setError('Staff corporate email address is required.');
      return;
    }
    if (!targetPassword) {
      setError('Authentication password is required.');
      return;
    }

    // Module 50 / Module 54: Trace form submission before request
    traceForm('StaffLogin', { role: targetRole, email: trimmed, password: targetPassword });

    setLoading(true);
    try {
      const res = await managerLogin(trimmed, targetPassword, targetRole);
      const resRole = res?.managerUser?.role || targetRole;
      const defaultTarget = getFirstQueueForRole(resRole);
      const fromPath = location.state?.from?.pathname;
      const fromSection = fromPath?.replace(/^\/manager\/?/, '');
      const target = (fromPath && fromPath.startsWith('/manager') && fromSection && hasSectionAccess(fromSection, res?.managerUser))
        ? fromPath
        : defaultTarget;
      navigate(target);
    } catch (err) {
      const msg = err?.detail || err?.error?.message || err?.message || 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const populateStaff = (s) => {
    const nextRole = s.role || '';
    setRole(nextRole);
    setRoleError('');
    setEmail(s.email || '');
    setPassword(s.password || '');
    setError('');
    setUserHasTyped(false);

    if (isDemo && nextRole) {
      handleSubmit(null, { role: nextRole, email: s.email, password: s.password });
    }
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    setRoleError('');

    if (!isDemo || !newRole) {
      return;
    }

    const demoAccounts = getDemoStaffAccounts() || [];
    const demoEmails = demoAccounts.map((a) => (a.email || '').trim().toLowerCase());
    const currentEmailTrimmed = (email || '').trim().toLowerCase();

    // Guard: if the email field currently holds a value that is NOT one of the seeded demo account emails
    // (the user has typed something of their own), changing the dropdown changes ONLY the role
    // — never overwrite typed credentials, never auto-submit.
    if (userHasTyped || (currentEmailTrimmed && !demoEmails.includes(currentEmailTrimmed))) {
      return;
    }

    const match = demoAccounts.find((a) => a.role === newRole);
    if (!match) {
      // If no demo account exists for the selected role, change only the role (no populate, no submit, no error).
      return;
    }

    setEmail(match.email);
    setPassword(match.password);
    setError('');
    handleSubmit(null, { role: newRole, email: match.email, password: match.password });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-porcelain-100 px-4 py-12 sm:px-6">
      <div className="w-full max-w-[420px]">
        <Card className="p-6 sm:p-8 shadow-card border border-ink-100 bg-white">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-midnight-900 text-gold-300 shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold text-midnight-950">Staff Operations Terminal</h1>
              <p className="text-xs text-ink-500">FinEdge Bank Internal Operations</p>
            </div>
          </div>

          {/* FormError placed above submit button per G.1 */}
          {isDemo && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-sm">
              <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>Demo mode — no server is connected. You are signing in to demonstration data stored only in this browser.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Signing in as" required error={roleError}>
              <Select
                value={role}
                onChange={handleRoleChange}
                error={!!roleError}
                aria-label="Signing in as"
              >
                <option value="">Select your role</option>
                {STAFF_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Staff Corporate Email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setUserHasTyped(true);
                  }}
                  placeholder="officer@finedge.bank"
                  className="pl-9"
                  autoComplete="username"
                />
              </div>
            </Field>

            <Field label="Security Key / Password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setUserHasTyped(true);
                  }}
                  placeholder="Enter staff security password"
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="pt-2">
                <FormError message={error} />
              </div>
            )}
            <div className="pt-2">
              <Button variant="primary" type="submit" loading={loading} className="w-full">
                Authenticate Staff Session <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          
          {/* Demo Staff Expander - Module 51 Part C */}
          {isDemo && (
            <div className="mt-6 border-t border-ink-100 pt-4">
              <button
                type="button"
                onClick={() => setDemoOpen(!demoOpen)}
                className="flex w-full items-center justify-between text-left text-xs font-semibold text-midnight-900"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-gold-600" />
                  <span>Demo access</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${demoOpen ? 'rotate-180' : ''}`} />
              </button>
              <p className="mt-1 text-xs text-ink-500">Demonstration accounts — no real credentials.</p>

              {demoOpen && (
                <div className="mt-3 space-y-2 text-xs text-ink-700">
                  <p className="text-xs text-ink-500 leading-relaxed">
                    Click any clearance role to populate operational login credentials:
                  </p>
                  <div className="space-y-2">
                    {getDemoStaffAccounts().map((s) => (
                      <button
                        key={s.email}
                        type="button"
                        onClick={() => populateStaff(s)}
                        className="w-full rounded-md border border-ink-200 bg-porcelain-50 p-2 text-left transition-colors hover:border-gold-400 hover:bg-gold-50/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-midnight-900">{s.role}</span>
                          <span className="font-mono text-xs text-ink-500">{s.email}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-600 line-clamp-1">{s.clearance || s.department || s.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 text-center border-t border-ink-100 pt-2.5">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="text-xs font-medium text-ink-500 hover:text-ink-700 underline transition-colors"
                >
                  Reset demo data
                </button>
              </div>
            </div>
          )}

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

          <div className="mt-6 text-center text-xs text-ink-500">
            <Link to="/portal/login" className="text-midnight-800 underline hover:text-midnight-950">
              Return to Customer Online Banking Portal
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ManagerLoginPage;
