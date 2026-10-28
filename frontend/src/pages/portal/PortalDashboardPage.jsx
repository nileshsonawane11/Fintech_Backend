import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button } from '../../components/common/UIComponents';
import { MOCK_TRANSACTIONS } from '../../data/bankingData';
import { 
  CreditCard, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Percent, 
  Send, 
  ShieldCheck, 
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';

export const PortalDashboardPage = () => {
  const { user, logout, applications } = useAuth();
  const navigate = useNavigate();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'transactions', 'applications'
  const [transferSuccess, setTransferSuccess] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferBeneficiary, setTransferBeneficiary] = useState('');

  if (!user) {
    navigate('/portal/login');
    return null;
  }

  const handleSimulateTransfer = (e) => {
    e.preventDefault();
    if (!transferAmount || !transferBeneficiary) return;
    setTransferSuccess({
      amount: transferAmount,
      beneficiary: transferBeneficiary,
      refId: `UTR-${Math.floor(100000000 + Math.random() * 900000000)}`,
      time: new Date().toLocaleTimeString('en-IN')
    });
    setTransferAmount('');
    setTransferBeneficiary('');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-[#1C1B1F] via-[#2D1619] to-[#450A0E] text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-amber-400">NetBanking Portal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 font-semibold border border-green-500/30">Active Session</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-gray-300">
              Customer ID: <span className="font-mono">{user.customerId}</span> • Primary Account: <span className="font-mono">•••• {user.primaryAccount.slice(-4)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outlineWhite"
              size="sm"
              onClick={() => { logout(); navigate('/portal/login'); }}
              icon={LogOut}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Account Balance & Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border-l-4 border-l-[#9D1D27]">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available Balance</span>
              <button 
                onClick={() => setBalanceVisible(!balanceVisible)} 
                className="text-gray-400 hover:text-gray-700"
                aria-label="Toggle balance visibility"
              >
                {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-3xl font-black text-[#1C1B1F] mb-1">
              {balanceVisible ? `₹ ${user.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••••••'}
            </div>
            <div className="text-xs text-green-700 font-semibold flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              <span>Next Monthly Interest Credit: ~₹894.20 (Oct 31)</span>
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-[#0288D1]">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Credit Line</span>
              <Badge variant="blue">Pre-Approved</Badge>
            </div>
            <div className="text-3xl font-black text-[#1C1B1F] mb-1">
              ₹ 5,00,000
            </div>
            <div className="text-xs text-gray-500">
              Personal Loan limit pre-approved at 8.75% p.a.
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Credit Card Portfolio</span>
              <Badge variant="gold">Ashva Metal</Badge>
            </div>
            <div className="text-3xl font-black text-[#1C1B1F] mb-1">
              ₹ 3,42,800
            </div>
            <div className="text-xs text-gray-500">
              Available Limit • Due: 28th Oct 2026 (₹12,410)
            </div>
          </Card>
        </div>

        {/* Portal Tabs Bar */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6 text-sm font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'overview' ? 'border-[#9D1D27] text-[#9D1D27]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Account Overview & Transfers
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'transactions' ? 'border-[#9D1D27] text-[#9D1D27]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Recent Transactions ({MOCK_TRANSACTIONS.length})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'applications' ? 'border-[#9D1D27] text-[#9D1D27]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Application Status Tracker ({applications.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Quick Transfer */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Quick Simulated Fund Transfer */}
            <div className="lg:col-span-6">
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Send className="w-5 h-5 text-[#9D1D27]" />
                  <div>
                    <h3 className="font-bold text-base text-[#1C1B1F]">Instant Transfer (IMPS / NEFT)</h3>
                    <p className="text-xs text-gray-500">Zero fee simulated domestic fund transfer</p>
                  </div>
                </div>

                {transferSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-green-700" />
                      <span>Transfer Successful: ₹ {transferSuccess.amount}</span>
                    </div>
                    <p>Sent to: {transferSuccess.beneficiary} • Ref: {transferSuccess.refId} at {transferSuccess.time}</p>
                    <span className="text-[10px] text-green-700 block italic">Note: Demo simulation. No real funds debited.</span>
                  </div>
                )}

                <form onSubmit={handleSimulateTransfer} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Beneficiary Name / Account / UPI ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Iyer or ramesh@upi"
                      value={transferBeneficiary}
                      onChange={(e) => setTransferBeneficiary(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#9D1D27]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100000}
                      placeholder="e.g. 5000"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#9D1D27]"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="sm" className="w-full">
                    Execute Demo Transfer
                  </Button>
                </form>
              </Card>
            </div>

            {/* Account Services & Notifications */}
            <div className="lg:col-span-6 space-y-4">
              <Card className="p-6 space-y-3">
                <h3 className="font-bold text-base text-[#1C1B1F]">Active Banking Services</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block">Debit Card Limit</span>
                    <strong className="text-gray-900">₹1,00,000 / day</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block">International Usage</span>
                    <strong className="text-green-700 font-bold">Enabled (0% Forex)</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block">Auto-Sweep FD</span>
                    <strong className="text-gray-900">Active (Threshold ₹1L)</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block">E-Statements</span>
                    <strong className="text-gray-900">Monthly on 1st</strong>
                  </div>
                </div>
              </Card>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Security Notice</span>
                </div>
                <p>
                  Your account is protected under FinEdge Zero-Liability guarantee. Real-time SMS alerts are dispatched for all debit transactions above ₹100.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Transactions Table */}
        {activeTab === 'transactions' && (
          <Card className="overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#1C1B1F]">Recent Ledger Entries (Savings Account)</h3>
              <span className="text-xs text-gray-500 font-mono">A/C: •••• 1920</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100/70 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Txn ID & Date</th>
                    <th className="p-3.5">Narration / Description</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MOCK_TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-gray-800">{tx.id}</div>
                        <div className="text-[11px] text-gray-400">{tx.date}</div>
                      </td>
                      <td className="p-3.5 font-medium text-gray-800">
                        {tx.description}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold">
                          {tx.category}
                        </span>
                      </td>
                      <td className={`p-3.5 text-right font-bold font-mono text-sm ${
                        tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {tx.type === 'credit' ? `+ ₹ ${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `- ₹ ${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 3: Application Status Tracker */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            {applications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500 text-sm">
                No active loan or account applications logged yet.
              </div>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className="p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#9D1D27]">{app.id}</span>
                        <Badge variant={app.status === 'Approved' ? 'green' : 'gold'}>{app.status}</Badge>
                      </div>
                      <h4 className="text-lg font-bold text-[#1C1B1F] mt-0.5">{app.productName}</h4>
                    </div>
                    <div className="text-xs text-gray-500">
                      Submitted on: <strong className="text-gray-800">{app.date}</strong>
                    </div>
                  </div>

                  {/* Multi-Stage Stepper */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    {app.steps?.map((step, sIdx) => (
                      <div 
                        key={sIdx}
                        className={`p-3 rounded-xl border ${
                          step.completed
                            ? 'bg-green-50/70 border-green-200 text-green-900'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {step.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold">{step.name}</span>
                        </div>
                        <span className="text-[11px] block opacity-80">{step.date}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
