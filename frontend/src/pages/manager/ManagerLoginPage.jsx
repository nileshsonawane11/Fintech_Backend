import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge } from '../../components/common/UIComponents';
import { ShieldAlert, Lock, UserCheck, AlertCircle, Building2, Key, ArrowLeft } from 'lucide-react';

export const ManagerLoginPage = () => {
  const { managerLogin } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('manager@finedge.bank');
  const [password, setPassword] = useState('Manager@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleManagerLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please provide staff email and authorization password.');
      return;
    }

    setLoading(true);
    try {
      await managerLogin(identifier, password);
      navigate('/manager/dashboard');
    } catch (err) {
      setError(err.detail || 'Access Denied: Invalid staff credentials or insufficient clearance.');
    } finally {
      setLoading(false);
    }
  };

  const setStaffPreset = (email, pwd) => {
    setIdentifier(email);
    setPassword(pwd);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 py-16 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 rounded-2xl flex items-center justify-center font-black text-2xl mx-auto shadow-xl border border-amber-400/40">
            <Building2 className="w-7 h-7 text-slate-950" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="warning" className="uppercase font-mono text-[10px] tracking-widest bg-amber-500/20 text-amber-300 border-amber-500/30">
              Internal Operations Portal
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">FinEdge Staff & Management</h1>
          <p className="text-xs text-slate-400">
            Restricted access terminal for Bank Officers, KYC Managers, and Branch Administrators.
          </p>
        </div>

        <Card className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 bg-red-950/80 border border-red-500/40 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleManagerLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Staff Corporate Email
              </label>
              <input
                type="email"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="officer@finedge.bank"
                className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Staff Password / Security PIN
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full py-3 text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-lg mt-2"
            >
              <Lock className="w-4 h-4 mr-1.5" /> {loading ? 'Authorizing Access...' : 'Authenticate Staff Terminal'}
            </Button>
          </form>

          {/* Quick Staff Presets */}
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block text-center">
              Quick Test Clearance Profiles
            </span>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setStaffPreset('manager@finedge.bank', 'Manager@2026')}
                className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-amber-300 hover:text-white transition-all text-center"
              >
                Branch Manager
              </button>
              <button
                type="button"
                onClick={() => setStaffPreset('kyc.officer@finedge.bank', 'Officer@2026')}
                className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-emerald-300 hover:text-white transition-all text-center"
              >
                KYC Officer
              </button>
              <button
                type="button"
                onClick={() => setStaffPreset('ops@finedge.bank', 'Operations@2026')}
                className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-cyan-300 hover:text-white transition-all text-center"
              >
                Account Ops
              </button>
            </div>
          </div>
        </Card>

        {/* Back Link to Customer Portal */}
        <div className="text-center">
          <Link
            to="/portal/login"
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer NetBanking Portal
          </Link>
        </div>

        {/* Audit Disclaimer */}
        <div className="text-center text-[10px] text-slate-600 space-y-1">
          <p>Notice: All login attempts and operations are recorded in the security audit ledger.</p>
          <p>Unauthorized access is monitored under the Information Technology Act & Banking Regulation Act.</p>
        </div>
      </div>
    </div>
  );
};
