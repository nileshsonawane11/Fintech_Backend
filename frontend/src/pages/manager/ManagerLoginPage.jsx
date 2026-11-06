import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, ShieldCheck, KeyRound, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button, Card, Field, FormError, Input, Modal } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';
import { getFirstQueueForRole, hasSectionAccess } from '../../services/managerBridge.js';
import { resetDemoDb, getDemoStaffAccounts } from '../../services/api.js';

export const STAFF_ACCOUNTS = getDemoStaffAccounts();

export const ManagerLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { managerLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const handleResetConfirm = () => {
    resetDemoDb();
    setResetOpen(false);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Staff corporate email address is required.');
      return;
    }
    if (!password) {
      setError('Authentication password is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await managerLogin(trimmed, password);
      const role = res?.managerUser?.role;
      const defaultTarget = getFirstQueueForRole(role);
      const fromPath = location.state?.from?.pathname;
      const fromSection = fromPath?.replace(/^\/manager\/?/, '');
      const target = (fromPath && fromPath.startsWith('/manager') && fromSection && hasSectionAccess(fromSection, res?.managerUser))
        ? fromPath
        : defaultTarget;
      navigate(target);
    } catch (err) {
      const msg = err?.error?.message || err?.detail || err?.title || 'Authentication failed. Check your staff credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const populateStaff = (s) => {
    setEmail(s.email);
    setPassword(s.password);
    setError('');
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

          {error && <FormError message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Staff Corporate Email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="pt-2">
              <Button variant="primary" type="submit" loading={loading} className="w-full">
                Authenticate Staff Session <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Demo Staff Expander */}
          <div className="mt-6 border-t border-ink-100 pt-4">
            <button
              type="button"
              onClick={() => setDemoOpen(!demoOpen)}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-midnight-900"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-gold-600" />
                Demo Staff Clearance Credentials
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${demoOpen ? 'rotate-180' : ''}`} />
            </button>

            {demoOpen && (
              <div className="mt-3 space-y-2 text-xs text-ink-700">
                <p className="text-[11px] text-ink-500 leading-relaxed">
                  Click any clearance role to populate operational login credentials:
                </p>
                <div className="space-y-2">
                  {STAFF_ACCOUNTS.map((s) => (
                    <button
                      key={s.email}
                      type="button"
                      onClick={() => populateStaff(s)}
                      className="w-full rounded-md border border-ink-200 bg-porcelain-50 p-2 text-left transition-colors hover:border-gold-400 hover:bg-gold-50/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-midnight-900">{s.role}</span>
                        <span className="font-mono text-[10px] text-ink-500">{s.email}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-600 line-clamp-1">{s.clearance}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

          <div className="mt-3 text-center border-t border-ink-100 pt-2.5">
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="text-[11px] font-medium text-ink-500 hover:text-ink-700 underline transition-colors"
            >
              Reset demo data
            </button>
          </div>
          </div>

          <div className="mt-6 text-center text-xs text-ink-500">
            <Link to="/portal/login" className="text-midnight-800 underline hover:text-midnight-950">
              Return to Customer Online Banking Portal
            </Link>
          </div>
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
        </Card>
      </div>
    </div>
  );
};

export default ManagerLoginPage;
