import React from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  FileText, 
  CreditCard, 
  History, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';

export const ManagerOverview = ({
  metrics,
  kycQueue,
  accountAppsQueue,
  cardAppsQueue,
  onNavigateTab
}) => {
  const pendingKyc = kycQueue.filter(k => k.status === 'SUBMITTED' || k.status === 'IN_REVIEW');
  const pendingAccounts = accountAppsQueue.filter(a => a.status === 'PENDING_APPROVAL');
  const pendingCards = cardAppsQueue.filter(c => c.status === 'PENDING_APPROVAL');

  const statCards = [
    {
      title: 'Total Active Customers',
      value: metrics.totalCustomers || 0,
      icon: Users,
      trend: '+12% this month',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      tab: 'customers'
    },
    {
      title: 'Pending KYC Dossiers',
      value: pendingKyc.length || metrics.pendingKycCount || 0,
      icon: ShieldCheck,
      trend: 'Standard SLA: 24h',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      tab: 'kyc'
    },
    {
      title: 'Account Opening Queue',
      value: pendingAccounts.length || metrics.pendingAccountApps || 0,
      icon: FileText,
      trend: 'Maker-Checker Required',
      color: 'text-midnight-900',
      bg: 'bg-red-50',
      tab: 'accounts'
    },
    {
      title: 'Credit Card Applications',
      value: pendingCards.length || metrics.pendingCardApps || 0,
      icon: CreditCard,
      trend: 'Automated Scoring Active',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      tab: 'cards'
    },
    {
      title: 'Authorized Staff Members',
      value: metrics.activeStaffCount || 3,
      icon: Building2,
      trend: 'RBAC Governed',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      tab: 'rbac'
    },
    {
      title: 'Audit Trail Records',
      value: metrics.totalAuditLogs || 48,
      icon: History,
      trend: 'Immutable Non-Repudiation',
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      tab: 'audit'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Institutional Core Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              FinEdge Core Banking Engine — Production Node 01
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Operational Pulse & Underwriting Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-branch customer onboarding, maker-checker authorizations, and statutory compliance status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-right">
            <div className="text-[11px] font-medium text-slate-500">System Availability</div>
            <div className="text-xs font-bold text-slate-900 font-mono">99.98% uptime (TLS 1.3)</div>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-right">
            <div className="text-[11px] font-medium text-slate-500">Core Settlement Batch</div>
            <div className="text-xs font-bold text-slate-900 font-mono">Real-Time IMPS / RTGS</div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              onClick={() => onNavigateTab(c.tab)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500">{c.title}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{c.value}</div>
                </div>
                <div className={`w-10 h-10 rounded-lg ${c.bg} ${c.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{c.trend}</span>
                <span className="text-slate-700 font-medium group-hover:text-midnight-900 flex items-center gap-1">
                  Manage <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Priority Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent KYC Verification Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Urgent KYC Compliance Dossiers</h3>
            </div>
            <button
              onClick={() => onNavigateTab('kyc')}
              className="text-xs font-semibold text-midnight-900 hover:underline"
            >
              View All ({pendingKyc.length})
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingKyc.slice(0, 4).map((k) => (
              <div key={k.kycCaseId} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-slate-900">{k.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Case: {k.kycCaseId} • PAN: {k.panNumberMasked || '••••••••'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    k.riskCategory === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {k.riskCategory || 'STANDARD'} RISK
                  </span>
                  <button
                    onClick={() => onNavigateTab('kyc')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
            {pendingKyc.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                All statutory KYC dossiers currently reviewed and up to date.
              </div>
            )}
          </div>
        </div>

        {/* Pending Account Opening Approvals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-midnight-900" />
              <h3 className="text-sm font-bold text-slate-900">Pending Account Underwriting</h3>
            </div>
            <button
              onClick={() => onNavigateTab('accounts')}
              className="text-xs font-semibold text-midnight-900 hover:underline"
            >
              View All ({pendingAccounts.length})
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingAccounts.slice(0, 4).map((a) => (
              <div key={a.accountApplicationId} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-slate-900">{a.customerName}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {a.productCode} • Initial: ₹{Number(a.initialFundingAmount).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    PENDING APPROVAL
                  </span>
                  <button
                    onClick={() => onNavigateTab('accounts')}
                    className="px-2.5 py-1 bg-midnight-900 text-white hover:bg-midnight-800 rounded text-xs font-semibold"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
            {pendingAccounts.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No account applications pending operations approval.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
