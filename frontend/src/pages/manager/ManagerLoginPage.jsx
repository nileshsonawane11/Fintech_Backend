import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button, Card, Field, FormError, Input } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';
import { getFirstQueueForRole, hasSectionAccess } from '../../services/managerBridge.js';
import { traceForm } from '../../lib/trace.js';

export const ManagerLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { managerLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    // Module 50: Trace form submission before request
    traceForm('StaffLogin', { email: trimmed, password });

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
      const msg = err?.detail || err?.error?.message || err?.message || 'Invalid credentials. Please verify your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
