import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  FileText
} from 'lucide-react';

export const ManagerLoginPage = () => {
  const { managerLogin } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('manager@finedge.bank');
  const [password, setPassword] = useState('Manager@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDevCredentials, setShowDevCredentials] = useState(false);

  // Check if running in development mode
  const isDevMode = import.meta.env.DEV;

  const handleManagerLogin = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      setError('Please provide your corporate staff email and authorization password.');
      return;
    }

    setLoading(true);
    try {
      const res = await managerLogin(trimmedId, password);
      
      // Role-based redirection to the appropriate operational workspace
      const role = res?.managerUser?.role;
      if (role === 'KYC_OFFICER') {
        navigate('/manager/dashboard?tab=kyc');
      } else if (role === 'ACCOUNT_OPS') {
        navigate('/manager/dashboard?tab=account-applications');
      } else {
        // Default to main operational overview for BANK_MANAGER or administrators
        navigate('/manager/dashboard');
      }
    } catch (err) {
      // Generic secure error message without disclosing account existence
      setError(err.detail || 'Access Denied: Invalid staff credentials or account disabled. Please verify with IT Security.');
    } finally {
      setLoading(false);
    }
  };

  const populateDevPreset = (email, pwd) => {
    setIdentifier(email);
    setPassword(pwd);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0B132B] flex items-center justify-center p-0 md:p-6 lg:p-10 font-sans antialiased">
      
      {/* Outer Shell: Balanced Split Layout for Enterprise Banking */}
      <div className="w-full max-w-5xl bg-white rounded-none md:rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-800/40 min-h-[640px]">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: INSTITUTIONAL BRANDING & OPERATIONS SHOWCASE (5 Columns) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle Background Photography Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/80 to-transparent pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9D1D27] text-white flex items-center justify-center font-black text-lg tracking-wider shadow-md">
                FE
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white block">
                  FinEdge Bank
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  Corporate Banking Group
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operations Gateway v2.6</span>
            </div>
          </div>

          {/* Center Contextual Mission */}
          <div className="relative z-10 my-8 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Institutional Operations & Risk Management Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Authorized access gateway for statutory CKYC inspection, deposit account underwriting, credit card dispatch, and regulatory compliance.
            </p>

            {/* Security Pillars */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>256-Bit TLS 1.3 Bank-Grade Session Encryption</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <KeyRound className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Granular Role-Based Access Control (RBAC)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Immutable Security & Tamper-Evident Audit Ledger</span>
              </div>
            </div>
          </div>

          {/* Bottom Regulatory Disclaimer */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Nariman Point Corporate Headquarters</p>
            <p className="text-[10px] text-slate-400 leading-normal">
              Licensed Commercial Bank under Banking Regulation Act, 1949. Unauthorized access attempts are monitored and logged.
            </p>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: SECURE STAFF LOGIN FORM (7 Columns) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-[#F8FAFC] p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
          
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Form Header */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#9D1D27] bg-[#9D1D27]/10 px-2 py-0.5 rounded">
                  Staff Authentication Terminal
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Sign In to Operations
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Enter your FinEdge corporate credentials to access authorized branch underwriting consoles.
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div 
                role="alert"
                className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleManagerLogin} className="space-y-4">
              
              {/* Staff Corporate Email / Employee ID */}
              <div className="space-y-1">
                <label 
                  htmlFor="staff-identifier" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Corporate Email or Employee ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="staff-identifier"
                    type="email"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="officer@finedge.bank"
                    className="w-full text-sm bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/20 focus:border-[#9D1D27] transition-all shadow-2xs font-medium"
                  />
                </div>
              </div>

              {/* Staff Password with Visibility Toggle */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label 
                    htmlFor="staff-password" 
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Authorization Password
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">256-Bit TLS</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter staff authorization password"
                    className="w-full text-sm bg-white border border-slate-300 rounded-xl pl-10 pr-11 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/20 focus:border-[#9D1D27] transition-all shadow-2xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#9D1D27] hover:bg-[#7A1620] active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authorizing Clearance...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In to Operations Terminal</span>
                  </>
                )}
              </button>

            </form>

            {/* ========================================================================= */}
            {/* DEVELOPMENT SANDBOX CONTROLS (ONLY RENDERED IN LOCAL DEV ENVIRONMENT) */}
            {/* ========================================================================= */}
            {isDevMode && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDevCredentials(!showDevCredentials)}
                  className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 py-1 font-semibold"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Developer Test Profiles (Local Dev Only)</span>
                  </span>
                  {showDevCredentials ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {showDevCredentials && (
                  <div className="mt-2.5 p-3 bg-slate-100/80 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <p className="text-[11px] text-slate-500">
                      Select a role to populate authorized test credentials. Requests are authenticated by the real backend.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => populateDevPreset('manager@finedge.bank', 'Manager@2026')}
                        className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-[11px] font-bold text-center shadow-2xs hover:border-[#9D1D27] transition-all"
                      >
                        Manager (L4)
                      </button>
                      <button
                        type="button"
                        onClick={() => populateDevPreset('kyc.officer@finedge.bank', 'Officer@2026')}
                        className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-[11px] font-bold text-center shadow-2xs hover:border-emerald-600 transition-all"
                      >
                        KYC Officer (L2)
                      </button>
                      <button
                        type="button"
                        onClick={() => populateDevPreset('operations@finedge.bank', 'Operations@2026')}
                        className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-[11px] font-bold text-center shadow-2xs hover:border-sky-600 transition-all"
                      >
                        Operations (L3)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Back link to Customer Portal */}
            <div className="pt-2 text-center">
              <Link
                to="/portal/login"
                className="text-xs text-slate-500 hover:text-[#9D1D27] inline-flex items-center gap-1.5 font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Retail NetBanking Login</span>
              </Link>
            </div>

          </div>

          {/* Bottom Security Audit Notice */}
          <div className="mt-8 pt-4 border-t border-slate-200/80 text-center text-[10px] text-slate-400 space-y-0.5">
            <p className="font-semibold text-slate-500">Statutory Banking Compliance Notice</p>
            <p>
              Access to this terminal is strictly limited to authorized bank officers. All authentication sessions and operational queries are recorded in the immutable security audit ledger.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
