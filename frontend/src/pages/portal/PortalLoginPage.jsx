import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge } from '../../components/common/UIComponents';
import { Lock, ShieldCheck, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export const PortalLoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mobileOrEmail, setMobileOrEmail] = useState('9876543210');
  const [otp, setOtp] = useState(['1', '2', '3', '4', '5', '6']);
  const [error, setError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!mobileOrEmail.trim()) {
      setError('Please provide registered mobile number or customer ID');
      return;
    }
    login(mobileOrEmail);
    navigate('/portal');
  };

  const fillQuickDemo = () => {
    setMobileOrEmail('9876543210');
    setOtp(['1', '2', '3', '4', '5', '6']);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 py-16">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#9D1D27] text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto shadow-md">
            FE
          </div>
          <h1 className="text-2xl font-extrabold text-[#1C1B1F]">NetBanking Secure Portal</h1>
          <p className="text-xs text-gray-500">Access your accounts, track applications, and view ledger records.</p>
        </div>

        <Card className="p-8 shadow-lg border-t-4 border-t-[#9D1D27]">
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>
                <strong>Simulated Sandbox Login:</strong> Demo mode pre-filled for Vikramaditya Sharma. No real credentials or SMS required.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Mobile Number / Customer ID
              </label>
              <input
                type="text"
                required
                value={mobileOrEmail}
                onChange={(e) => setMobileOrEmail(e.target.value)}
                placeholder="10-digit mobile or Customer ID"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  6-Digit OTP / Secure Token
                </label>
                <span className="text-[11px] text-green-700 font-semibold">Auto-Generated (123456)</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const newOtp = [...otp];
                      newOtp[idx] = e.target.value;
                      setOtp(newOtp);
                    }}
                    className="h-11 text-center font-bold text-lg border border-gray-300 rounded-lg focus:outline-none focus:border-[#9D1D27] focus:ring-2 focus:ring-[#9D1D27]/20"
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full py-2.5 text-sm font-bold shadow-sm">
              <Lock className="w-4 h-4 mr-1" /> Log In to Portal
            </Button>

            <button
              type="button"
              onClick={fillQuickDemo}
              className="w-full text-center text-xs text-[#9D1D27] hover:underline font-semibold"
            >
              Reset to One-Click Demo Credentials
            </button>
          </form>
        </Card>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-gray-400 space-y-1">
          <p>FinEdge will never solicit your card PIN, CVV, or one-time password over phone or email.</p>
          <p>Protected by 256-bit TLS encryption with session auto-expiry after 15 minutes of inactivity.</p>
        </div>
      </div>
    </div>
  );
};
