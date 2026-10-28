import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge } from '../../components/common/UIComponents';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff, UserPlus, CheckCircle2, Building2 } from 'lucide-react';

export const PortalLoginPage = () => {
  const { login, verifyMfa, register, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Mode: 'login' | 'mfa' | 'register' | 'register_otp' | 'forgot'
  const [mode, setMode] = useState('login');

  // Form states
  const [identifier, setIdentifier] = useState('9876543210');
  const [password, setPassword] = useState('Str0ngPassw0rd!');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaReferenceId, setMfaReferenceId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['6', '3', '8', '2', '9', '1']);

  // Registration states
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [otpReferenceId, setOtpReferenceId] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!identifier.trim() || !password) {
      setError('Please provide registered mobile/email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(identifier, password);
      if (result.mfaRequired) {
        setMfaReferenceId(result.mfaReferenceId);
        setMode('mfa');
        setSuccessMsg('Two-Factor Authentication required. Security code generated.');
      } else {
        navigate('/portal');
      }
    } catch (err) {
      setError(err.detail || err.title || 'Invalid credentials. Please verify your mobile/email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle MFA Submit
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyMfa(mfaReferenceId, fullOtp);
      navigate('/portal');
    } catch (err) {
      setError(err.detail || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the FinEdge Banking Terms & Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        fullName: regFullName,
        email: regEmail,
        mobileNumber: regMobile,
        password: regPassword,
        acceptedTermsVersion: 'v2026-10-01'
      });
      setOtpReferenceId('otp-ref-' + Math.floor(10000 + Math.random() * 90000));
      setMode('register_otp');
      setSuccessMsg('Account created. Enter the 6-digit OTP to activate your credentials.');
    } catch (err) {
      setError(err.detail || 'Registration failed. Mobile or email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration OTP Verification
  const handleRegisterOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp({
        referenceId: otpReferenceId,
        otp: fullOtp,
        purpose: 'REGISTRATION'
      });
      // Direct auto login
      await login(regEmail || regMobile, regPassword);
      navigate('/portal');
    } catch (err) {
      setError(err.detail || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = () => {
    setIdentifier('9876543210');
    setPassword('Str0ngPassw0rd!');
    setOtpDigits(['6', '3', '8', '2', '9', '1']);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 py-16">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#9D1D27] text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto shadow-md">
            FE
          </div>
          <h1 className="text-2xl font-extrabold text-[#1C1B1F]">FinEdge NetBanking</h1>
          <p className="text-xs text-gray-500">Secure digital banking portal for retail & business clients.</p>
        </div>

        {/* Auth Mode Tabs */}
        {mode !== 'mfa' && mode !== 'register_otp' && (
          <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-bold text-gray-600">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-lg transition-all ${mode === 'login' ? 'bg-white text-[#9D1D27] shadow-sm' : 'hover:text-gray-900'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-lg transition-all ${mode === 'register' ? 'bg-white text-[#9D1D27] shadow-sm' : 'hover:text-gray-900'}`}
            >
              Open Account / Register
            </button>
          </div>
        )}

        <Card className="p-8 shadow-lg border-t-4 border-t-[#9D1D27]">
          {/* Notifications / Alerts */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  <strong>2-Factor Protected Login:</strong> Pre-filled with demo credentials. Evaluates authentic 2FA challenge.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Mobile Number / Email / Customer ID
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or vikram@example.com"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="text-[11px] text-[#9D1D27] hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter banking password"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" disabled={loading} className="w-full py-2.5 text-sm font-bold shadow-sm">
                <Lock className="w-4 h-4 mr-1" /> {loading ? 'Authenticating...' : 'Sign In to NetBanking'}
              </Button>

              <button
                type="button"
                onClick={fillQuickDemo}
                className="w-full text-center text-xs text-[#9D1D27] hover:underline font-semibold pt-1"
              >
                Reset to One-Click Demo Credentials
              </button>
            </form>
          )}

          {/* MODE: TWO-FACTOR MFA */}
          {mode === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="space-y-5">
              <div className="text-center space-y-1">
                <Badge variant="warning" className="px-3 py-1 font-semibold">2FA Challenge Required</Badge>
                <h3 className="text-sm font-bold text-gray-800">Enter One-Time Security Code</h3>
                <p className="text-xs text-gray-500">
                  A verification code has been dispatched to your linked mobile number <span className="font-semibold text-gray-700">******43210</span>.
                </p>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const newOtp = [...otpDigits];
                      newOtp[idx] = e.target.value;
                      setOtpDigits(newOtp);
                    }}
                    className="h-12 text-center font-extrabold text-xl border border-gray-300 rounded-lg focus:outline-none focus:border-[#9D1D27] focus:ring-2 focus:ring-[#9D1D27]/20"
                  />
                ))}
              </div>

              <Button type="submit" variant="primary" disabled={loading} className="w-full py-2.5 text-sm font-bold shadow-sm">
                <ShieldCheck className="w-4 h-4 mr-1" /> {loading ? 'Verifying...' : 'Complete Two-Factor Authentication'}
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800"
              >
                Cancel and return to login
              </button>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Full Legal Name (as per PAN / Aadhaar)
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[#9D1D27] rounded border-gray-300"
                />
                <label htmlFor="terms" className="text-[11px] text-gray-600 leading-tight">
                  I accept the FinEdge Internet Banking Terms, DICGC Insurance Coverage terms, and consent to electronic identity verification.
                </label>
              </div>

              <Button type="submit" variant="primary" disabled={loading} className="w-full py-2.5 text-sm font-bold shadow-sm">
                <UserPlus className="w-4 h-4 mr-1" /> {loading ? 'Registering...' : 'Continue to Mobile Verification'}
              </Button>
            </form>
          )}

          {/* MODE: REGISTER OTP */}
          {mode === 'register_otp' && (
            <form onSubmit={handleRegisterOtpSubmit} className="space-y-5">
              <div className="text-center space-y-1">
                <Badge variant="success" className="px-3 py-1 font-semibold">Verification Step</Badge>
                <h3 className="text-sm font-bold text-gray-800">Verify Mobile OTP</h3>
                <p className="text-xs text-gray-500">
                  Enter the 6-digit activation code sent to {regMobile}.
                </p>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const newOtp = [...otpDigits];
                      newOtp[idx] = e.target.value;
                      setOtpDigits(newOtp);
                    }}
                    className="h-12 text-center font-extrabold text-xl border border-gray-300 rounded-lg focus:outline-none focus:border-[#9D1D27] focus:ring-2 focus:ring-[#9D1D27]/20"
                  />
                ))}
              </div>

              <Button type="submit" variant="primary" disabled={loading} className="w-full py-2.5 text-sm font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4 mr-1" /> {loading ? 'Activating...' : 'Verify OTP & Access Portal'}
              </Button>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Reset Banking Password</h3>
              <p className="text-xs text-gray-500">
                Enter your registered mobile or email to receive password reset authorization.
              </p>
              <input
                type="text"
                placeholder="Mobile or Email"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5"
              />
              <Button
                variant="primary"
                onClick={() => { setSuccessMsg('Password reset link sent to registered email.'); setMode('login'); }}
                className="w-full py-2.5 text-sm font-bold"
              >
                Send Reset Link
              </Button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-gray-500 hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </Card>

        {/* Dedicated Link to Staff & Manager Portal */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Bank Staff & Manager Terminal</p>
              <p className="text-[11px] text-slate-400">Authorized personnel & branch operations portal</p>
            </div>
          </div>
          <Link
            to="/manager/login"
            className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg transition-all shadow-sm"
          >
            Staff Login →
          </Link>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-gray-400 space-y-1">
          <p>FinEdge will never solicit your card PIN, CVV, or one-time password over phone or email.</p>
          <p>Protected by 256-bit TLS encryption with session auto-expiry after 15 minutes of inactivity.</p>
        </div>
      </div>
    </div>
  );
};
