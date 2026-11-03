import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, ShieldCheck, KeyRound, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button, Card, Field, FormError, Input } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

const STAFF_ACCOUNTS = [
  {
    role: 'Chief Branch Manager',
    email: 'manager@finedge.bank',
    password: 'Manager@2026',
    clearance: 'Full administrative control: accounts, cards, staff provisioning & audit'
  },
  {
    role: 'Senior KYC Officer',
    email: 'kyc.officer@finedge.bank',
    password: 'Manager@2026',
    clearance: 'Statutory KYC queue, document inspection & AML risk profiling'
  },
  {
    role: 'Account & Card Ops',
    email: 'ops@finedge.bank',
    password: 'Manager@2026',
    clearance: 'Account opening verification & card embossing queue'
  }
];

export const ManagerLoginPage = () => {
  const navigate = useNavigate();
  const { managerLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

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
      await managerLogin(trimmed, password);
      navigate('/manager/dashboard');
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
                      className="flex w-full flex-col rounded-lg border border-ink-100 bg-porcelain-50 p-2.5 text-left hover:border-midnight-300 hover:bg-midnight-50/50 transition-colors"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-midnight-950">{s.role}</span>
                        <span className="text-[11px] font-medium text-midnight-700 underline">Use credentials →</span>
                      </div>
                      <span className="font-mono text-[11px] text-ink-600">{s.email}</span>
                      <span className="text-[10px] text-ink-500 mt-0.5">{s.clearance}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-ink-500">
          Not bank staff?{' '}
          <Link to="/portal/login" className="font-medium text-midnight-800 underline hover:text-midnight-950">
            Customer NetBanking Portal →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ManagerLoginPage;
