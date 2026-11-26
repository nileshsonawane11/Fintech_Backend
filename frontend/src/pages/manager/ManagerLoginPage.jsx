import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight, ChevronDown, KeyRound, Info } from 'lucide-react';
import { Button, Card, Field, FormError, Input, Modal, Select } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';
import { getFirstQueueForRole, hasSectionAccess } from '../../services/managerBridge.js';
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
  const [searchParams] = useSearchParams();
  const { managerUser, isManagerAuthenticated, managerLogin, managerLogout } = useAuth();

  // Status & Feedback - Part 1(d) Session expiry notice
  const isSessionExpired = Boolean(
    location.state?.sessionExpired || 
    location.state?.reason === 'session_expired' || 
    searchParams.get('reason') === 'session_expired' ||
    searchParams.get('expired') === 'true'
  );

  // Part 1(a): A logged-in staff member visiting /manager/login is redirected to their operations dashboard
  useEffect(() => {
    if (isSessionExpired) {
      if (managerLogout) managerLogout();
      return;
    }
    if (managerUser || isManagerAuthenticated) {
      const dest = location.state?.from?.pathname || location.state?.from || '/manager/dashboard';
      navigate(dest, { replace: true });
    }
  }, [managerUser, isManagerAuthenticated, navigate, location, isSessionExpired, managerLogout]);

  const [role, setRole] = useState('');
  const [roleError, setRoleError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback - Part 1(d) Session expiry notice
  const [error, setError] = useState(
    isSessionExpired ? 'Your session has expired due to inactivity. Please sign in again.' : ''
  );
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
      const loggedRole = res?.managerUser?.role || res?.customer?.role || targetRole;
      const defaultTarget = getFirstQueueForRole(loggedRole);
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

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    setRoleError('');
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-porcelain-100 px-4 py-12 sm:px-6">
      <div className="w-full max-w-[420px]">
        <Card className="p-6 sm:p-8 shadow-card border border-ink-100 bg-white">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bank-primary text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="font-sans text-xl font-bold text-ink-900">Staff Operations Terminal</h1>
              <p className="text-xs text-ink-500">FinEdge Bank Internal Operations</p>
            </div>
          </div>

          {/* FormError placed above submit button per G.1 */}
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

          
          <div className="mt-6 text-center text-xs text-ink-500">
            <Link to="/portal/login" className="text-bank-primary underline hover:text-bank-primary-hover">
              Return to Customer Online Banking Portal
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ManagerLoginPage;
