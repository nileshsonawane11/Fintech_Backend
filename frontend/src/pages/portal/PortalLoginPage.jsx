import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Card,
  Button,
  Field,
  Input,
  FormError,
  OtpInput,
  ResendOtp
} from '../../components/ui.jsx';
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Landmark,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { traceForm } from '../../lib/trace.js';

function BrandMark() {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-midnight-900 text-gold-300 shadow-sm">
        <Landmark className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-3 font-display text-2xl font-semibold text-midnight-950">FinEdge Bank</h1>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">Customer NetBanking Portal</p>
    </div>
  );
}

export const PortalLoginPage = () => {
  const { login, verifyMfa, register, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'mfa' | 'register' | 'register_otp'
  const [mode, setMode] = useState('login');

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaReferenceId, setMfaReferenceId] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');

  // Registration states
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [otpReferenceId, setOtpReferenceId] = useState('');

  // Status & Feedback
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Masked target for OTP
  const getMaskedTarget = (val) => {
    if (!val) return '••••••';
    if (val.includes('@')) {
      const parts = val.split('@');
      const name = parts[0];
      const maskedName = name.length > 2 ? `${name[0]}••••${name.slice(-1)}` : '••••';
      return `${maskedName}@${parts[1]}`;
    }
    return val.length >= 4 ? `••••••${val.slice(-4)}` : '••••••';
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSuccessMsg('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setFieldErrors({ identifier: 'Please enter your registered email, mobile, or Customer ID' });
      return;
    }
    if (!password) {
      setFieldErrors({ password: 'Password is required' });
      return;
    }

    // Module 50: Trace form submission
    traceForm('CustomerLogin', { identifier: trimmedId, password });

    setLoading(true);
    try {
      const result = await login(trimmedId, password);
      if (result?.mfaRequired) {
        setMfaReferenceId(result.mfaReferenceId);
        setMfaOtp('');
        setMode('mfa');
        setSuccessMsg('Two-Factor Authentication required. Security code dispatched.');
      } else {
        navigate(location.state?.from?.pathname || location.state?.from || '/portal');
      }
    } catch (err) {
const msg = err?.detail || err?.error?.message || err?.errors?.[0]?.message || err?.message || err?.title || 'Invalid credentials. Please verify your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (codeToSubmit) => {
    const code = codeToSubmit || mfaOtp;
    setError('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    // Module 50: Trace MFA submission
    traceForm('CustomerMfaVerify', { mfaReferenceId, otp: code });

    setLoading(true);
    try {
      await verifyMfa(mfaReferenceId, code);
      navigate(location.state?.from?.pathname || location.state?.from || '/portal');
    } catch (err) {
      const msg = err?.detail || err?.error?.message || err?.message || 'Invalid or expired OTP code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};

    if (!regFullName.trim()) errs.regFullName = 'Full legal name is required';
    if (!regMobile.trim() || !/^\d{10}$/.test(regMobile)) errs.regMobile = 'Enter a valid 10-digit mobile number';
    if (!regEmail.trim() || !regEmail.includes('@')) errs.regEmail = 'Enter a valid email address';
    if (!regPassword || regPassword.length < 8) errs.regPassword = 'Password must be at least 8 characters long';
    if (regPassword !== regConfirmPassword) errs.regConfirmPassword = 'Passwords do not match';
    if (!acceptedTerms) errs.acceptedTerms = 'Mandatory consent required for terms of service';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    const regPayload = {
      fullName: regFullName.trim(),
      mobileNumber: regMobile.trim(),
      email: regEmail.trim(),
      password: regPassword,
      acceptedTermsVersion: 'v2026-10-01',
      marketingConsent: false
    };

    // Module 50: Trace Registration Form
    traceForm('CustomerRegistration', regPayload);

    setLoading(true);
    try {
      const res = await register(regPayload);
      setOtpReferenceId(res?.otpReferenceId || 'REF-' + Date.now());
      setMode('login');
      setSuccessMsg(`Verification OTP sent to ${getMaskedTarget(regMobile)}.`);
    } catch (err) {
const msg = err?.detail || err?.error?.message || err?.errors?.[0]?.message || err?.message || 'Registration failed. Please check your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOtpSubmit = async (codeToSubmit) => {
    const code = codeToSubmit || regOtp;
    setError('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    const verifyPayload = {
      referenceId: otpReferenceId,
      otp: code,
      email: regEmail.trim(),
      mobileNumber: regMobile.trim(),
      purpose: 'REGISTRATION'
    };

    // Module 50: Trace Registration OTP Verify
    traceForm('RegistrationOtpVerify', verifyPayload);

    setLoading(true);
    try {
      await verifyOtp(verifyPayload);
      navigate(location.state?.from?.pathname || location.state?.from || '/portal');
    } catch (err) {
      const msg = err?.detail || err?.error?.message || err?.message || 'Invalid or expired OTP code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center bg-porcelain-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <BrandMark />

        <Card className="mt-8 p-6 sm:p-8 shadow-card border border-ink-100 bg-white">
          {error && <FormError message={error} />}
          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode 1: Standard Credentials Login */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Field label="User ID, Registered Email, or Mobile" error={fieldErrors.identifier} required>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or mobile"
                    className="pl-9"
                    error={Boolean(fieldErrors.identifier)}
                  />
                </div>
              </Field>

              <Field label="Password" error={fieldErrors.password} required>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="pl-9 pr-10"
                    error={Boolean(fieldErrors.password)}
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

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-ink-500">256-bit TLS Encrypted Session</span>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  className="font-medium text-midnight-800 hover:underline"
                >
                  New to FinEdge? Register
                </button>
              </div>

              <div className="pt-2">
                <Button variant="primary" type="submit" loading={loading} className="w-full">
                  Sign in to NetBanking <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* Mode 2: MFA Second Step */}
          {mode === 'mfa' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-midnight-50 text-midnight-800">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-2 text-base font-semibold text-midnight-950">Two-Factor Security</h3>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Enter the 6-digit security passkey dispatched to your registered device.
                </p>
              </div>

              <div className="py-2">
                <OtpInput
                  length={6}
                  value={mfaOtp}
                  onChange={(val) => setMfaOtp(val)}
                  onComplete={(val) => handleMfaSubmit(val)}
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-ink-500 hover:text-midnight-900"
                >
                  ← Back to Login
                </button>
                <ResendOtp onResend={() => setSuccessMsg('New security code dispatched')} />
              </div>

              <Button
                variant="primary"
                className="w-full"
                loading={loading}
                onClick={() => handleMfaSubmit()}
              >
                Verify &amp; Continue
              </Button>
            </div>
          )}

          {/* Mode 3: Self-Service Customer Registration */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="border-b border-ink-100 pb-2">
                <h3 className="text-sm font-semibold text-midnight-950">Create New Customer Account</h3>
                <p className="text-xs text-ink-500">Instant digital onboarding in under 3 minutes.</p>
              </div>

              <Field label="Full Legal Name" error={fieldErrors.regFullName} required>
                <Input
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  error={Boolean(fieldErrors.regFullName)}
                />
              </Field>

              <Field label="Mobile Number" error={fieldErrors.regMobile} required>
                <Input
                  type="tel"
                  maxLength={10}
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  error={Boolean(fieldErrors.regMobile)}
                />
              </Field>

              <Field label="Email Address" error={fieldErrors.regEmail} required>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@domain.com"
                  error={Boolean(fieldErrors.regEmail)}
                />
              </Field>

              <Field label="Set Portal Password" error={fieldErrors.regPassword} required>
                <div className="relative">
                  <Input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                    error={Boolean(fieldErrors.regPassword)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm Password" error={fieldErrors.regConfirmPassword} required>
                <Input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  error={Boolean(fieldErrors.regConfirmPassword)}
                />
              </Field>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-xs text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded border-ink-300 text-midnight-900 focus:ring-midnight-900"
                  />
                  <span>
                    I confirm that I am an Indian citizen residing in India, and agree to FinEdge&apos;s{' '}
                    <Link to="/terms-and-conditions" className="text-midnight-800 underline">Terms</Link> and{' '}
                    <Link to="/privacy-policy" className="text-midnight-800 underline">Privacy Policy</Link>.
                  </span>
                </label>
                {fieldErrors.acceptedTerms && <p className="mt-1 text-xs text-rose-600">{fieldErrors.acceptedTerms}</p>}
              </div>

              <div className="pt-2">
                <Button variant="primary" type="submit" loading={loading} className="w-full">
                  Create Account <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-xs text-ink-500 hover:text-midnight-900"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}

          {/* Mode 4: Registration OTP Verification */}
          {mode === 'register_otp' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mt-2 text-base font-semibold text-midnight-950">Verify Your Mobile</h3>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Enter the 6-digit one-time passcode sent to {getMaskedTarget(regMobile)}.
                </p>
              </div>

              <div className="py-2">
                <OtpInput
                  length={6}
                  value={regOtp}
                  onChange={(val) => setRegOtp(val)}
                  onComplete={(val) => handleRegisterOtpSubmit(val)}
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-ink-500 hover:text-midnight-900"
                >
                  ← Edit Information
                </button>
                <ResendOtp onResend={() => setSuccessMsg('New security code dispatched')} />
              </div>

              <Button
                variant="primary"
                className="w-full"
                loading={loading}
                onClick={() => handleRegisterOtpSubmit()}
              >
                Complete Registration
              </Button>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-ink-500">
          Bank staff member?{' '}
          <Link to="/manager/login" className="font-medium text-midnight-800 underline hover:text-midnight-950">
            Staff Operations Terminal →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PortalLoginPage;
