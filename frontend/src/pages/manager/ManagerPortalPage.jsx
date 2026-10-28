import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge } from '../../components/common/UIComponents';
import { managerService } from '../../services/managerService';
import { getDb, saveDb, appendAuditLog } from '../../services/api';
import {
  Building2,
  Users,
  ShieldCheck,
  FileText,
  CreditCard,
  UserPlus,
  Key,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  LogOut,
  ExternalLink,
  Lock,
  Eye,
  Check,
  RefreshCw,
  Plus,
  FileCheck
} from 'lucide-react';

export const ManagerPortalPage = () => {
  const { managerUser, isManagerAuthenticated, managerLogout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'dashboard' | 'customers' | 'kyc' | 'account-applications' | 'card-applications' | 'users' | 'roles' | 'audit-logs'
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setActiveTab = (tab) => setSearchParams({ tab });

  // Data states
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    pendingKycCount: 0,
    pendingAccountApps: 0,
    pendingCardApps: 0,
    activeStaffCount: 0,
    totalAuditLogs: 0
  });

  const [customersList, setCustomersList] = useState([]);
  const [kycQueue, setKycQueue] = useState([]);
  const [accountAppsQueue, setAccountAppsQueue] = useState([]);
  const [cardAppsQueue, setCardAppsQueue] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [auditList, setAuditList] = useState([]);

  // Modals & form states
  const [selectedKycCase, setSelectedKycCase] = useState(null);
  const [kycRemarks, setKycRemarks] = useState('All verification checks passed. Approved.');
  const [kycRisk, setKycRisk] = useState('LOW');

  // Staff creation form
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('Operations');
  const [newStaffRole, setNewStaffRole] = useState('KYC_OFFICER');

  // Selected staff for permissions
  const [selectedStaffId, setSelectedStaffId] = useState('STF-001');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllData = async () => {
    try {
      const [m, custs, kyc, accApps, cardApps, staff, audit] = await Promise.all([
        managerService.getMetrics(),
        managerService.getCustomers(),
        managerService.getKycApplications(),
        managerService.getAccountApplications(),
        managerService.getCardApplications(),
        managerService.getStaffUsers(),
        managerService.getAuditLogs()
      ]);
      setMetrics(m);
      setCustomersList(custs || []);
      setKycQueue(kyc || []);
      setAccountAppsQueue(accApps || []);
      setCardAppsQueue(cardApps || []);
      setStaffList(staff || []);
      setAuditList(audit || []);
    } catch (e) {
      console.error('Error loading manager data', e);
    }
  };

  useEffect(() => {
    if (!isManagerAuthenticated) {
      navigate('/manager/login');
      return;
    }
    loadAllData();
  }, [isManagerAuthenticated, navigate]);

  if (!isManagerAuthenticated || !managerUser) return null;

  // KYC Approve Action
  const handleApproveKyc = async (kycCaseId) => {
    try {
      await managerService.approveKyc(kycCaseId, {
        remarks: kycRemarks,
        riskCategory: kycRisk
      });
      setSelectedKycCase(null);
      await loadAllData();
      alert(`KYC Case ${kycCaseId} has been successfully APPROVED.`);
    } catch (e) {
      alert(e.detail || e.message || 'Error approving KYC');
    }
  };

  // KYC Reject Action
  const handleRejectKyc = async (kycCaseId) => {
    const reason = prompt('Please enter reason for KYC rejection:', 'Incomplete address verification or blurred identity card');
    if (!reason) return;
    try {
      await managerService.rejectKyc(kycCaseId, { remarks: reason });
      setSelectedKycCase(null);
      await loadAllData();
      alert(`KYC Case ${kycCaseId} has been REJECTED.`);
    } catch (e) {
      alert(e.detail || e.message || 'Error rejecting KYC');
    }
  };

  // Account Application Approval
  const handleApproveAccount = async (appId) => {
    try {
      await managerService.approveAccountApplication(appId);
      await loadAllData();
      alert(`Account Application ${appId} Approved! New account created and activated.`);
    } catch (e) {
      alert(e.detail || e.message || 'Error approving account');
    }
  };

  // Card Application Approval
  const handleApproveCard = async (cardAppId) => {
    try {
      await managerService.approveCardApplication(cardAppId);
      await loadAllData();
      alert(`Card Application ${cardAppId} Approved! Card issued and linked.`);
    } catch (e) {
      alert(e.detail || e.message || 'Error approving card');
    }
  };

  // Add Staff User
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;
    try {
      await managerService.createStaffUser({
        fullName: newStaffName,
        email: newStaffEmail,
        department: newStaffDept,
        role: newStaffRole,
        roleTitle: newStaffRole === 'BANK_MANAGER' ? 'Branch Manager' : 'Operations Officer',
        permissions: ['customers.read', 'kyc.read', 'kyc.review']
      });
      setShowAddStaffModal(false);
      setNewStaffName('');
      setNewStaffEmail('');
      await loadAllData();
      alert('New staff member provisioned successfully.');
    } catch (e) {
      alert(e.detail || e.message || 'Error creating staff user');
    }
  };

  // Toggle Staff Status (Active / Disabled)
  const handleToggleStaffStatus = async (staffId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await managerService.toggleStaffStatus(staffId, newStatus);
      await loadAllData();
      alert(`Staff ${staffId} status updated to ${newStatus}.`);
    } catch (e) {
      alert(e.detail || e.message || 'Error updating staff status');
    }
  };

  // Permission Toggle
  const currentStaff = staffList.find(s => s.staffId === selectedStaffId) || staffList[0];
  const allPermissions = [
    { module: 'Customer Management', code: 'customers.read', label: 'View Customer Profiles' },
    { module: 'Customer Management', code: 'customers.update', label: 'Edit Customer Information' },
    { module: 'KYC Operations', code: 'kyc.read', label: 'Inspect Submitted KYC Records' },
    { module: 'KYC Operations', code: 'kyc.review', label: 'Conduct Document Verification' },
    { module: 'KYC Operations', code: 'kyc.approve', label: 'Approve or Reject KYC Cases' },
    { module: 'Account Operations', code: 'accounts.read', label: 'View Account Applications' },
    { module: 'Account Operations', code: 'accounts.review', label: 'Review Initial Funding & Nominee' },
    { module: 'Account Operations', code: 'accounts.approve', label: 'Activate & Open New Accounts' },
    { module: 'Card Operations', code: 'cards.read', label: 'View Card Applications' },
    { module: 'Card Operations', code: 'cards.review', label: 'Assess Card Eligibility' },
    { module: 'Card Operations', code: 'cards.approve', label: 'Issue & Dispatch Cards' },
    { module: 'Card Operations', code: 'cards.block', label: 'Place Emergency Card Holds' },
    { module: 'Staff Administration', code: 'staff.read', label: 'View Staff Directory' },
    { module: 'Staff Administration', code: 'staff.create', label: 'Provision New Staff Members' },
    { module: 'Staff Administration', code: 'staff.update', label: 'Modify Staff Clearance' },
    { module: 'Roles & Governance', code: 'roles.read', label: 'View Security Roles' },
    { module: 'Roles & Governance', code: 'roles.manage', label: 'Manage Permission Schemes' },
    { module: 'Roles & Governance', code: 'permissions.assign', label: 'Assign Delegated Access' },
    { module: 'Audit & Compliance', code: 'audit.read', label: 'Inspect Security Audit Trails' },
    { module: 'Audit & Compliance', code: 'reports.read', label: 'Export Regulatory Reports' }
  ];

  const handleTogglePermission = async (permCode) => {
    if (!currentStaff) return;
    const exists = currentStaff.permissions?.includes(permCode);
    const updated = exists
      ? currentStaff.permissions.filter(p => p !== permCode)
      : [...(currentStaff.permissions || []), permCode];

    await managerService.updateStaffPermissions(currentStaff.staffId, updated);
    await loadAllData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* OPERATIONS APP HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-xl shadow-md">
            FE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white tracking-wide uppercase">FinEdge Operations & Staff Portal</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
                Staff Terminal v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Logged in: <strong className="text-slate-200">{managerUser.name}</strong> ({managerUser.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/portal"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Customer View
          </Link>
          <Button
            variant="outline"
            onClick={managerLogout}
            className="text-xs py-1.5 px-3 bg-red-950/40 text-red-300 border-red-500/30 hover:bg-red-900/40"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" /> Terminate Staff Session
          </Button>
        </div>
      </header>

      {/* SECONDARY NAVIGATION BAR */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none text-xs font-bold text-slate-400">
        {[
          { id: 'dashboard', label: 'Operations Dashboard', icon: Building2 },
          { id: 'customers', label: 'Customers Directory', icon: Users, count: customersList.length },
          { id: 'kyc', label: 'KYC Review Queue', icon: ShieldCheck, count: kycQueue.filter(k => k.status === 'UNDER_REVIEW' || k.status === 'SUBMITTED').length },
          { id: 'account-applications', label: 'Account Applications', icon: FileText, count: accountAppsQueue.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'PENDING_APPROVAL').length },
          { id: 'card-applications', label: 'Card Applications', icon: CreditCard, count: cardAppsQueue.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'PENDING_APPROVAL').length },
          { id: 'users', label: 'Staff Management', icon: UserPlus, count: staffList.length },
          { id: 'roles', label: 'Roles & Permissions', icon: Key },
          { id: 'audit-logs', label: 'Security Audit Logs', icon: History, count: auditList.length }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                active
                  ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  active ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-amber-400 border border-amber-500/20'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* ========================================================================= */}
        {/* 1. OPERATIONS DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Branch Operations Summary</h2>
              <p className="text-xs text-slate-400">Real-time database metrics across retail onboarding, credit queues, and risk assessment.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { title: 'Total Customers', val: metrics.totalCustomers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { title: 'Pending KYC', val: metrics.pendingKycCount, icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-500/10', alert: metrics.pendingKycCount > 0 },
                { title: 'Pending Accounts', val: metrics.pendingAccountApps, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { title: 'Card Requests', val: metrics.pendingCardApps, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { title: 'Active Staff', val: metrics.activeStaffCount, icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { title: 'Audit Entries', val: metrics.totalAuditLogs, icon: History, color: 'text-pink-400', bg: 'bg-pink-500/10' }
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.title}</span>
                      <div className={`w-7 h-7 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">{card.val}</span>
                      {card.alert && <span className="text-[10px] text-amber-400 font-bold animate-pulse">Action req.</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Processing Queues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* KYC Priority Queue */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Pending KYC Verification Queue</h3>
                    <p className="text-[11px] text-slate-400">Applications awaiting compliance officer inspection</p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveTab('kyc')} className="text-xs py-1 px-3 border-slate-700 text-amber-300">
                    Open Queue →
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {kycQueue.slice(0, 3).map(k => (
                    <div key={k.kycCaseId} className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{k.fullName}</span>
                          <span className="text-[10px] font-mono text-slate-400">{k.kycCaseId}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Income: {k.annualIncomeRange?.replace('_', ' - ')} • {k.occupation}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={k.status === 'APPROVED' ? 'success' : 'warning'}>{k.status}</Badge>
                        <Button
                          variant="primary"
                          onClick={() => { setSelectedKycCase(k); setActiveTab('kyc'); }}
                          className="text-[11px] py-1 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Applications Priority Queue */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Account Opening Queue</h3>
                    <p className="text-[11px] text-slate-400">Submitted customer accounts awaiting manager activation</p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveTab('account-applications')} className="text-xs py-1 px-3 border-slate-700 text-amber-300">
                    Open Queue →
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {accountAppsQueue.slice(0, 3).map(a => (
                    <div key={a.accountApplicationId} className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{a.customerName}</span>
                          <span className="text-[10px] font-mono text-slate-400">{a.productName}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Initial Funding: ₹ {Number(a.initialFundingAmount).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={a.status === 'APPROVED' ? 'success' : 'warning'}>{a.status}</Badge>
                        {a.status !== 'APPROVED' && (
                          <Button
                            variant="primary"
                            onClick={() => handleApproveAccount(a.accountApplicationId)}
                            className="text-[11px] py-1 px-2.5 bg-green-600 hover:bg-green-500 text-white font-bold"
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CUSTOMERS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white">Registered Customer Directory</h2>
                <p className="text-xs text-slate-400">Inspect full customer records, risk assessments, and active portfolios.</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Customer ID</th>
                    <th className="py-3 px-4">Full Legal Name</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">PAN</th>
                    <th className="py-3 px-4">KYC State</th>
                    <th className="py-3 px-4">Risk Category</th>
                    <th className="py-3 px-4">Onboarding Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {customersList.map(c => (
                    <tr key={c.customerId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{c.customerId}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{c.fullName}</td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {c.email}<br />
                        <span className="text-[11px] text-slate-500">{c.mobileNumber}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{c.pan || 'UNVERIFIED'}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={c.kycStatus === 'APPROVED' ? 'success' : 'warning'}>{c.kycStatus}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-400">{c.riskCategory || 'LOW'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{c.createdAt?.split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. KYC REVIEW QUEUE */}
        {/* ========================================================================= */}
        {activeTab === 'kyc' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">KYC Compliance & Verification Queue</h2>
              <p className="text-xs text-slate-400">Perform statutory CKYC checks, document inspections, and risk level classifications.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Queue List */}
              <div className="lg:col-span-2 space-y-3">
                {kycQueue.map(k => (
                  <div
                    key={k.kycCaseId}
                    onClick={() => setSelectedKycCase(k)}
                    className={`cursor-pointer p-4 rounded-3xl border transition-all ${
                      selectedKycCase?.kycCaseId === k.kycCaseId
                        ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/20'
                        : 'bg-slate-900/70 border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400">{k.kycCaseId}</span>
                          <span className="text-sm font-bold text-white">{k.fullName}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Customer: <span className="text-slate-200">{k.customerId}</span> • Occupation: {k.occupation}
                        </p>
                      </div>
                      <Badge variant={k.status === 'APPROVED' ? 'success' : 'warning'}>{k.status}</Badge>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500 pt-3 mt-2 border-t border-slate-800">
                      <span>Submitted: {k.submittedAt?.split('T')[0]}</span>
                      <span className="font-bold text-slate-300">Income: {k.annualIncomeRange?.replace('_', ' - ')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inspector Panel */}
              <div className="space-y-4">
                {selectedKycCase ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 sticky top-24">
                    <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Case Inspector</span>
                        <h4 className="text-base font-extrabold text-white">{selectedKycCase.fullName}</h4>
                        <span className="text-xs font-mono text-slate-400">{selectedKycCase.kycCaseId}</span>
                      </div>
                      <Badge variant={selectedKycCase.status === 'APPROVED' ? 'success' : 'warning'}>
                        {selectedKycCase.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Aadhaar Consent</span>
                        <span className="text-green-400 font-bold">{selectedKycCase.aadhaarConsent ? 'Recorded' : 'Not Given'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Occupation</span>
                        <span className="text-white font-bold">{selectedKycCase.occupation}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Income Tier</span>
                        <span className="text-white font-bold">{selectedKycCase.annualIncomeRange?.replace('_', ' - ')}</span>
                      </div>
                    </div>

                    {/* Document Inspection */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Uploaded Evidence Files</span>
                      <div className="space-y-1.5">
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <span className="text-slate-300">1. PAN Card Document</span>
                          <span className="text-emerald-400 font-mono text-[10px]">Verified Hash</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <span className="text-slate-300">2. Address Proof (Utility)</span>
                          <span className="text-emerald-400 font-mono text-[10px]">Verified Hash</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Form */}
                    {selectedKycCase.status !== 'APPROVED' ? (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Risk Category</label>
                          <select
                            value={kycRisk}
                            onChange={(e) => setKycRisk(e.target.value)}
                            className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                          >
                            <option value="LOW">LOW — Standard Retail Individual</option>
                            <option value="MEDIUM">MEDIUM — High Turnover / MSME</option>
                            <option value="HIGH">HIGH — Enhanced Due Diligence Req.</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Audit Remarks</label>
                          <input
                            type="text"
                            value={kycRemarks}
                            onChange={(e) => setKycRemarks(e.target.value)}
                            className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="primary"
                            onClick={() => handleApproveKyc(selectedKycCase.kycCaseId)}
                            className="flex-1 py-2 text-xs bg-green-600 hover:bg-green-500 text-white font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve KYC
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleRejectKyc(selectedKycCase.kycCaseId)}
                            className="flex-1 py-2 text-xs border-red-500/40 text-red-400 hover:bg-red-950"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-950/40 border border-green-500/30 rounded-xl text-center text-xs text-green-300 font-bold">
                        KYC Approved by {selectedKycCase.approvedBy || 'OPS-2001'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
                    Select a KYC case from the queue to inspect documents and record approval.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. ACCOUNT APPLICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'account-applications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Account Opening Underwriting Queue</h2>
              <p className="text-xs text-slate-400">Review submitted deposit/current accounts, initial funding, and nominee designations.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Initial Funding</th>
                    <th className="py-3 px-4">Nominee Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {accountAppsQueue.map(a => (
                    <tr key={a.accountApplicationId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{a.accountApplicationId}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{a.customerName}</td>
                      <td className="py-3.5 px-4 text-slate-200">{a.productName}</td>
                      <td className="py-3.5 px-4 font-bold text-white">₹ {Number(a.initialFundingAmount).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {a.nominee?.fullName || 'N/A'} ({a.nominee?.relationship || ''})
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={a.status === 'APPROVED' ? 'success' : 'warning'}>{a.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {a.status !== 'APPROVED' ? (
                          <Button
                            variant="primary"
                            onClick={() => handleApproveAccount(a.accountApplicationId)}
                            className="text-xs py-1 px-3 bg-green-600 hover:bg-green-500 text-white font-bold"
                          >
                            Approve & Open
                          </Button>
                        ) : (
                          <span className="text-xs text-green-400 font-bold">Activated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. CARD APPLICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'card-applications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Card Issuance & Dispatch Queue</h2>
              <p className="text-xs text-slate-400">Review contactless debit cards and metal credit card requests.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Card App ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Card Variant</th>
                    <th className="py-3 px-4">Linked Account</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {cardAppsQueue.map(c => (
                    <tr key={c.cardApplicationId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{c.cardApplicationId}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{c.customerName}</td>
                      <td className="py-3.5 px-4 text-slate-200">{c.cardName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{c.linkedAccountId}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={c.status === 'APPROVED' ? 'success' : 'warning'}>{c.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {c.status !== 'APPROVED' ? (
                          <Button
                            variant="primary"
                            onClick={() => handleApproveCard(c.cardApplicationId)}
                            className="text-xs py-1 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                          >
                            Approve & Issue
                          </Button>
                        ) : (
                          <span className="text-xs text-green-400 font-bold">Issued</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. STAFF USER MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white">Internal Staff Directory</h2>
                <p className="text-xs text-slate-400">Provision internal employees, manage clearances, and assign department roles.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowAddStaffModal(true)}
                className="text-xs py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Provision New Staff User
              </Button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Staff ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Corporate Email</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Permissions</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {staffList.map(s => (
                    <tr key={s.staffId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{s.staffId}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{s.fullName}</td>
                      <td className="py-3.5 px-4 text-slate-300">{s.email}</td>
                      <td className="py-3.5 px-4 text-slate-400">{s.department}</td>
                      <td className="py-3.5 px-4 text-amber-300 font-bold">{s.roleTitle}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={s.status === 'ACTIVE' ? 'success' : 'danger'}>{s.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {s.permissions?.length || 0} permissions
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {s.role !== 'BANK_MANAGER' && (
                          <button
                            onClick={() => handleToggleStaffStatus(s.staffId, s.status)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                              s.status === 'ACTIVE'
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
                            }`}
                          >
                            {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ROLES & PERMISSIONS */}
        {/* ========================================================================= */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Role-Based Access Control (RBAC) & Permissions Matrix</h2>
              <p className="text-xs text-slate-400">Assign granular permissions across customer records, KYC operations, account underwriting, and audit logs.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Select Employee */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-white">Select Internal Employee</h3>
                <div className="space-y-2">
                  {staffList.map(st => (
                    <div
                      key={st.staffId}
                      onClick={() => setSelectedStaffId(st.staffId)}
                      className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                        selectedStaffId === st.staffId
                          ? 'bg-amber-500/10 border-amber-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">{st.fullName}</p>
                      <p className="text-[11px] text-slate-400">{st.email} • {st.roleTitle}</p>
                      <span className="text-[10px] font-mono text-amber-400">{st.permissions?.length || 0} effective permissions</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Effective Permissions for {currentStaff?.fullName}
                    </h3>
                    <p className="text-xs text-slate-400">Toggle permissions to update delegated security clearance immediately.</p>
                  </div>
                  <Badge variant="warning">{currentStaff?.permissions?.length || 0} Enabled</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
                  {allPermissions.map(p => {
                    const hasPerm = currentStaff?.permissions?.includes(p.code);
                    return (
                      <div
                        key={p.code}
                        onClick={() => handleTogglePermission(p.code)}
                        className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-start justify-between ${
                          hasPerm
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 block">{p.module}</span>
                          <h4 className="text-xs font-bold text-white">{p.label}</h4>
                          <span className="text-[10px] font-mono text-slate-400 block">{p.code}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-1 ${
                          hasPerm ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {hasPerm && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. AUDIT LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Immutable Security Audit Trail</h2>
              <p className="text-xs text-slate-400">Tamper-evident operational ledger recording staff administrative actions and financial operations.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Log ID</th>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Acting User</th>
                    <th className="py-3 px-4">Action Performed</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {auditList.map(l => (
                    <tr key={l.logId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">{l.logId}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{l.timestamp}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{l.actor}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-amber-300 border border-slate-700">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{l.target}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="success">{l.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: PROVISION STAFF USER */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white">Provision Internal Staff Member</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Shalini Nair"
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1 uppercase">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="shalini.nair@finedge.bank"
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1 uppercase">Department</label>
                <select
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Operations">Branch Operations</option>
                  <option value="Compliance & AML">Compliance & AML</option>
                  <option value="Credit & Underwriting">Credit & Underwriting</option>
                  <option value="Card Operations">Card Operations</option>
                  <option value="Internal Audit">Internal Audit</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1 uppercase">Initial Role Template</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="KYC_OFFICER">KYC Verification Officer</option>
                  <option value="ACCOUNT_OPS">Account & Card Operations Specialist</option>
                  <option value="BANK_MANAGER">Branch Manager</option>
                  <option value="AUDIT_VIEWER">Audit & Regulatory Inspector</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddStaffModal(false)} className="flex-1 py-2 text-xs border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                  Provision User
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
