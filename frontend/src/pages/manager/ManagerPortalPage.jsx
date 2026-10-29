import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge } from '../../components/common/UIComponents';
import { managerService } from '../../services/managerService';
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
  FileCheck,
  ChevronRight,
  Info,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  HelpCircle,
  CheckSquare,
  Wrench
} from 'lucide-react';

export const ManagerPortalPage = () => {
  const { managerUser, isManagerAuthenticated, managerLogout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role permissions check
  const isManager = managerUser?.role === 'BANK_MANAGER';
  const isKycOfficer = managerUser?.role === 'KYC_OFFICER';
  const isOpsOfficer = managerUser?.role === 'ACCOUNT_OPS';

  const defaultTab = isKycOfficer ? 'kyc' : isOpsOfficer ? 'account-applications' : 'dashboard';
  const activeTab = searchParams.get('tab') || defaultTab;
  const setActiveTab = (tab) => setSearchParams({ tab });

  // Core Data States
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
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [kycStatusFilter, setKycStatusFilter] = useState('ALL');
  const [kycRiskFilter, setKycRiskFilter] = useState('ALL');
  const [accountStatusFilter, setAccountStatusFilter] = useState('ALL');
  const [accountProductFilter, setAccountProductFilter] = useState('ALL');
  const [cardStatusFilter, setCardStatusFilter] = useState('ALL');

  // KYC Inspector states
  const [selectedKycCase, setSelectedKycCase] = useState(null);
  const [kycRemarks, setKycRemarks] = useState('All statutory documents and CKYC checks verified. Approved.');
  const [kycRisk, setKycRisk] = useState('LOW');

  // Underwriting Modal state (for Account Applications)
  const [underwriteApp, setUnderwriteApp] = useState(null);
  const [underwriteNotes, setUnderwriteNotes] = useState('Eligibility verified against minimum initial funding and CKYC records.');

  // Confirmation Modals
  const [confirmActionModal, setConfirmActionModal] = useState(null); // { type, title, message, onConfirm, actionLabel, isDanger }
  const [rejectionReason, setRejectionReason] = useState('');

  // Dev Tools Modal
  const [showDevToolsModal, setShowDevToolsModal] = useState(false);

  // Staff creation form
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('Operations');
  const [newStaffRole, setNewStaffRole] = useState('KYC_OFFICER');

  // Customer onboarding modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustPan, setNewCustPan] = useState('');
  const [newCustOccupation, setNewCustOccupation] = useState('SALARIED');
  const [newCustIncome, setNewCustIncome] = useState('1000000_1500000');
  const [newCustCity, setNewCustCity] = useState('Mumbai');
  const [newCustState, setNewCustState] = useState('MAHARASHTRA');

  // Selected staff for permissions matrix
  const [selectedStaffId, setSelectedStaffId] = useState('STF-001');

  // Feedback Notification banner
  const [actionNotice, setActionNotice] = useState(null);
  const showNotice = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Load all operational data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        managerService.getMetrics(),
        managerService.getCustomers(),
        managerService.getKycApplications(),
        managerService.getAccountApplications(),
        managerService.getCardApplications(),
        managerService.getStaffUsers(),
        managerService.getAuditLogs()
      ]);

      if (results[0].status === 'fulfilled') setMetrics(results[0].value);
      if (results[1].status === 'fulfilled') setCustomersList(results[1].value || []);
      if (results[2].status === 'fulfilled') {
        const queue = results[2].value || [];
        setKycQueue(queue);
        // keep inspector in sync if currently selected case was updated
        if (selectedKycCase) {
          const fresh = queue.find(k => k.kycCaseId === selectedKycCase.kycCaseId);
          if (fresh) setSelectedKycCase(fresh);
        }
      }
      if (results[3].status === 'fulfilled') {
        const accounts = results[3].value || [];
        setAccountAppsQueue(accounts);
        if (underwriteApp) {
          const fresh = accounts.find(a => a.accountApplicationId === underwriteApp.accountApplicationId);
          if (fresh) setUnderwriteApp(fresh);
        }
      }
      if (results[4].status === 'fulfilled') setCardAppsQueue(results[4].value || []);
      if (results[5].status === 'fulfilled') setStaffList(results[5].value || []);
      if (results[6].status === 'fulfilled') setAuditList(results[6].value || []);
    } catch (e) {
      console.error('Error loading manager operations data', e);
    } finally {
      setIsLoading(false);
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

  // =========================================================================
  // WORKFLOW DECISION HANDLERS WITH CONFIRMATIONS
  // =========================================================================

  // KYC Approval Flow
  const triggerApproveKyc = (kCase) => {
    setConfirmActionModal({
      title: 'Confirm Statutory KYC Approval',
      message: `You are approving KYC verification for ${kCase.fullName} (${kCase.kycCaseId}). This will upgrade customer status to VERIFIED and authorize account activation.`,
      actionLabel: 'Authorize & Approve KYC',
      isDanger: false,
      onConfirm: async () => {
        try {
          await managerService.approveKyc(kCase.kycCaseId, {
            remarks: kycRemarks,
            riskCategory: kycRisk
          });
          await loadAllData();
          showNotice(`KYC Case ${kCase.kycCaseId} for ${kCase.fullName} successfully APPROVED.`, 'success');
        } catch (e) {
          showNotice(e.detail || e.message || 'Error approving KYC case', 'error');
        }
      }
    });
  };

  // KYC Rejection Flow
  const triggerRejectKyc = (kCase) => {
    setRejectionReason('Documents provided are blurry, unverified, or do not match statutory CKYC database.');
    setConfirmActionModal({
      title: 'Reject KYC Verification Case',
      message: `Please specify the compliance reason for rejecting KYC for ${kCase.fullName} (${kCase.kycCaseId}):`,
      actionLabel: 'Confirm Rejection',
      isDanger: true,
      hasInput: true,
      inputLabel: 'Rejection Reason / Compliance Notes',
      onConfirm: async (reason) => {
        try {
          await managerService.rejectKyc(kCase.kycCaseId, { remarks: reason || rejectionReason });
          await loadAllData();
          showNotice(`KYC Case ${kCase.kycCaseId} has been REJECTED.`, 'warning');
        } catch (e) {
          showNotice(e.detail || e.message || 'Error rejecting KYC', 'error');
        }
      }
    });
  };

  // KYC Request Additional Info Flow
  const triggerRequestKycInfo = (kCase) => {
    setRejectionReason('Please upload a high-resolution copy of your PAN Card and recent electricity/water bill.');
    setConfirmActionModal({
      title: 'Request Missing Information / Clarification',
      message: `Notify customer ${kCase.fullName} to submit additional compliance documents:`,
      actionLabel: 'Dispatch Information Request',
      isDanger: false,
      hasInput: true,
      inputLabel: 'Required Information / Documents Description',
      onConfirm: async (reason) => {
        try {
          // Re-record as submitted with informational review note
          await managerService.rejectKyc(kCase.kycCaseId, { remarks: `INFO_REQUIRED: ${reason || rejectionReason}` });
          await loadAllData();
          showNotice(`Information request dispatched to customer ${kCase.fullName}.`, 'info');
        } catch (e) {
          showNotice(e.detail || e.message || 'Error requesting information', 'error');
        }
      }
    });
  };

  // Account Application Approval Flow
  const triggerApproveAccount = (app) => {
    // Check KYC status first
    const cust = customersList.find(c => c.customerId === app.customerId);
    const isKycVerified = cust?.kycStatus === 'APPROVED';

    setConfirmActionModal({
      title: 'Authorize Account Opening & Core Banking Creation',
      message: `You are approving Account Application ${app.accountApplicationId} for ${app.customerName}. A real bank account will be materialized with ₹${Number(app.initialFundingAmount).toLocaleString('en-IN')} initial funding.`,
      warningText: !isKycVerified ? 'Notice: Customer KYC record is not yet verified in the system. Proceed only if authorized by compliance override.' : null,
      actionLabel: 'Approve & Activate Account',
      isDanger: false,
      onConfirm: async () => {
        try {
          await managerService.approveAccountApplication(app.accountApplicationId);
          setUnderwriteApp(null);
          await loadAllData();
          showNotice(`Account application ${app.accountApplicationId} approved! New account activated for ${app.customerName}.`, 'success');
        } catch (e) {
          showNotice(e.detail || e.message || 'Error approving account application', 'error');
        }
      }
    });
  };

  // Account Application Rejection Flow
  const triggerRejectAccount = (app) => {
    setRejectionReason('Initial funding threshold or CIBIL underwriting criteria not met.');
    setConfirmActionModal({
      title: 'Reject Account Opening Application',
      message: `Provide underwriting justification for rejecting application ${app.accountApplicationId} (${app.customerName}):`,
      actionLabel: 'Reject Application',
      isDanger: true,
      hasInput: true,
      inputLabel: 'Underwriting Rejection Reason',
      onConfirm: async (reason) => {
        try {
          await managerService.rejectAccountApplication(app.accountApplicationId, { remarks: reason || rejectionReason });
          setUnderwriteApp(null);
          await loadAllData();
          showNotice(`Account application ${app.accountApplicationId} rejected.`, 'warning');
        } catch (e) {
          showNotice(e.detail || e.message || 'Error rejecting application', 'error');
        }
      }
    });
  };

  // Card Application Approval Flow
  const triggerApproveCard = (cardApp) => {
    setConfirmActionModal({
      title: 'Authorize Card Issuance & Dispatch',
      message: `Approve ${cardApp.cardName} issuance for ${cardApp.customerName} linked to account ${cardApp.linkedAccountId}?`,
      actionLabel: 'Authorize & Issue Card',
      isDanger: false,
      onConfirm: async () => {
        try {
          await managerService.approveCardApplication(cardApp.cardApplicationId);
          await loadAllData();
          showNotice(`Card application ${cardApp.cardApplicationId} approved. Card issued and dispatched.`, 'success');
        } catch (e) {
          showNotice(e.detail || e.message || 'Error approving card application', 'error');
        }
      }
    });
  };

  // Card Application Rejection Flow
  const triggerRejectCard = (cardApp) => {
    setRejectionReason('Credit score or linked account average balance below card tier requirement.');
    setConfirmActionModal({
      title: 'Reject Card Application',
      message: `Provide justification for declining ${cardApp.cardName} for ${cardApp.customerName}:`,
      actionLabel: 'Reject Card Application',
      isDanger: true,
      hasInput: true,
      inputLabel: 'Decline Reason',
      onConfirm: async (reason) => {
        try {
          await managerService.rejectCardApplication(cardApp.cardApplicationId, { remarks: reason || rejectionReason });
          await loadAllData();
          showNotice(`Card application ${cardApp.cardApplicationId} declined.`, 'warning');
        } catch (e) {
          showNotice(e.detail || e.message || 'Error rejecting card application', 'error');
        }
      }
    });
  };

  // Customer Profile Registration
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await managerService.createCustomer({
        fullName: newCustName,
        email: newCustEmail,
        mobileNumber: newCustMobile,
        pan: newCustPan.toUpperCase(),
        occupation: newCustOccupation,
        annualIncomeRange: newCustIncome,
        kycStatus: 'APPROVED',
        riskCategory: 'LOW',
        address: {
          addressLine1: 'FinEdge Registered Account',
          addressLine2: 'Branch Operations Desk',
          city: newCustCity,
          state: newCustState,
          postalCode: '400001',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      });
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustEmail('');
      setNewCustMobile('');
      setNewCustPan('');
      await loadAllData();
      showNotice(`Customer profile for ${newCustName} successfully registered!`, 'success');
    } catch (err) {
      showNotice(err.detail || err.message || 'Error registering customer profile', 'error');
    }
  };

  // Staff User Provisioning
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;
    try {
      await managerService.createStaffUser({
        fullName: newStaffName,
        email: newStaffEmail,
        department: newStaffDept,
        role: newStaffRole,
        roleTitle: newStaffRole === 'BANK_MANAGER' ? 'Branch Manager' : newStaffRole === 'KYC_OFFICER' ? 'KYC Verification Officer' : 'Account & Card Operations Specialist',
        permissions: ['customers.read', 'kyc.read', 'kyc.review']
      });
      setShowAddStaffModal(false);
      setNewStaffName('');
      setNewStaffEmail('');
      await loadAllData();
      showNotice('Internal staff member provisioned successfully.', 'success');
    } catch (e) {
      showNotice(e.detail || e.message || 'Error creating staff user', 'error');
    }
  };

  // Staff Status Toggle
  const handleToggleStaffStatus = async (staffId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await managerService.toggleStaffStatus(staffId, newStatus);
      await loadAllData();
      showNotice(`Staff ${staffId} status updated to ${newStatus}.`, 'info');
    } catch (e) {
      showNotice(e.detail || e.message || 'Error updating staff status', 'error');
    }
  };

  // RBAC Permission Toggle
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

  // Helper for status badge variant
  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'VERIFIED':
      case 'ACTIVE':
        return <Badge variant="success">Approved</Badge>;
      case 'PENDING_APPROVAL':
      case 'UNDER_REVIEW':
      case 'SUBMITTED':
        return <Badge variant="warning">Under Review</Badge>;
      case 'REJECTED':
      case 'FAILED':
      case 'DISABLED':
        return <Badge variant="danger">Rejected</Badge>;
      case 'INFO_REQUIRED':
        return <Badge variant="warning">Info Required</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* 1. INSTITUTIONAL OPERATIONS HEADER */}
      {/* ========================================================================= */}
      <header className="bg-[#0F172A] border-b border-slate-800 text-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Brand & Staff Clearance Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#9D1D27] text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm">
              FE
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white tracking-wide">
                  FinEdge Operations Portal
                </span>
                {isManager && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#9D1D27]/30 text-rose-200 font-mono font-bold border border-[#9D1D27]/60">
                    Level 4 — Executive Clearance
                  </span>
                )}
                {isKycOfficer && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                    Level 2 — Compliance Clearance
                  </span>
                )}
                {isOpsOfficer && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-mono font-bold border border-sky-500/40">
                    Level 3 — Operations Clearance
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Core Banking Online
                </span>
              </div>
              
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Officer: <strong className="text-white font-semibold">{managerUser.name}</strong></span>
                <span>•</span>
                <span>{managerUser.roleTitle || (isManager ? 'Branch Manager' : isKycOfficer ? 'Compliance Officer' : 'Operations Specialist')}</span>
                <span>•</span>
                <span>Nariman Point Branch (0042)</span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
              title="Refresh real-time queue data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Separated Dev Tools Button */}
            <button
              onClick={() => setShowDevToolsModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-300 text-xs border border-slate-700/80 transition-colors"
              title="Development & Sandbox Tools"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sandbox Tools</span>
            </button>

            <Link
              to="/portal"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer View</span>
            </Link>

            <button
              onClick={managerLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/60 transition-colors ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. RESTRAINED ENTERPRISE NAVIGATION BAR */}
        {/* ========================================================================= */}
        <div className="bg-[#1E293B] border-t border-slate-800 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-1 py-1.5">
            {[
              { id: 'dashboard', label: 'Operations Dashboard', icon: Building2 },
              ...(isKycOfficer || isManager
                ? [{
                    id: 'kyc',
                    label: 'KYC Compliance Queue',
                    icon: ShieldCheck,
                    count: kycQueue.filter(k => k.status === 'UNDER_REVIEW' || k.status === 'SUBMITTED').length
                  }]
                : []),
              ...(isOpsOfficer || isManager
                ? [
                    {
                      id: 'account-applications',
                      label: 'Account Underwriting',
                      icon: FileText,
                      count: accountAppsQueue.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'PENDING_APPROVAL').length
                    },
                    {
                      id: 'card-applications',
                      label: 'Card Issuance Queue',
                      icon: CreditCard,
                      count: cardAppsQueue.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'PENDING_APPROVAL').length
                    }
                  ]
                : []),
              { id: 'customers', label: 'Customer Directory', icon: Users, count: customersList.length },
              ...(isManager
                ? [
                    { id: 'users', label: 'Staff Management', icon: UserPlus, count: staffList.length },
                    { id: 'roles', label: 'RBAC & Clearances', icon: Key }
                  ]
                : []),
              { id: 'audit-logs', label: 'Security Audit Trail', icon: History, count: auditList.length }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white text-[#9D1D27] shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#9D1D27]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      active
                        ? 'bg-[#9D1D27]/10 text-[#9D1D27] font-bold'
                        : 'bg-slate-800 text-amber-300 border border-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className={`py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 text-center transition-all ${
          actionNotice.type === 'success' ? 'bg-emerald-600 text-white' :
          actionNotice.type === 'warning' ? 'bg-amber-600 text-white' :
          actionNotice.type === 'info' ? 'bg-sky-600 text-white' :
          'bg-rose-600 text-white'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionNotice.text}</span>
          <button onClick={() => setActionNotice(null)} className="ml-3 underline text-[11px] opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN OPERATIONS WORKSPACE */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ========================================================================= */}
        {/* MODULE 1: OPERATIONS DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Context Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Branch Operations Summary</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time operational overview across retail customer onboarding, KYC compliance, and core banking queues.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Operating Day: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Restrained Enterprise KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { title: 'Total Customers', val: metrics.totalCustomers, icon: Users, sub: 'Registered CIFs' },
                { title: 'Pending KYC', val: metrics.pendingKycCount, icon: ShieldCheck, alert: metrics.pendingKycCount > 0, sub: 'Needs Inspection' },
                { title: 'Pending Accounts', val: metrics.pendingAccountApps, icon: FileText, alert: metrics.pendingAccountApps > 0, sub: 'Awaiting Activation' },
                { title: 'Card Requests', val: metrics.pendingCardApps, icon: CreditCard, sub: 'Ready for Issuance' },
                { title: 'Active Staff', val: metrics.activeStaffCount, icon: UserPlus, sub: 'Internal Users' },
                { title: 'Audit Entries', val: metrics.totalAuditLogs, icon: History, sub: 'Security Events' }
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.title}</span>
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900 font-mono">{card.val}</span>
                      {card.alert && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Action req.
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">{card.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* Operational Priority Queues Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* KYC Priority Queue */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">KYC Compliance Queue</h3>
                    <p className="text-[11px] text-slate-500">Applications awaiting customer due diligence and inspection</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('kyc')}
                    className="text-xs font-bold text-[#9D1D27] hover:underline flex items-center gap-1"
                  >
                    <span>View All ({kycQueue.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {kycQueue.slice(0, 3).map(k => (
                    <div key={k.kycCaseId} className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg flex justify-between items-center transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{k.fullName}</span>
                          <span className="text-[10px] font-mono text-slate-500">{k.kycCaseId}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Income: {k.annualIncomeRange?.replace('_', ' - ')} • {k.occupation}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(k.status)}
                        <Button
                          variant="white"
                          size="sm"
                          onClick={() => { setSelectedKycCase(k); setActiveTab('kyc'); }}
                          className="text-[11px] py-1 px-2.5 font-bold border border-slate-300"
                        >
                          Inspect
                        </Button>
                      </div>
                    </div>
                  ))}
                  {kycQueue.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No pending KYC cases in queue.
                    </div>
                  )}
                </div>
              </div>

              {/* Account Applications Priority Queue */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Account Opening Underwriting</h3>
                    <p className="text-[11px] text-slate-500">Retail customer applications ready for account activation</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('account-applications')}
                    className="text-xs font-bold text-[#9D1D27] hover:underline flex items-center gap-1"
                  >
                    <span>View All ({accountAppsQueue.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {accountAppsQueue.slice(0, 3).map(a => (
                    <div key={a.accountApplicationId} className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg flex justify-between items-center transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{a.customerName}</span>
                          <span className="text-[10px] font-mono text-slate-500">{a.accountApplicationId}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{a.productName} • Funding: ₹{Number(a.initialFundingAmount).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(a.status)}
                        {a.status !== 'APPROVED' ? (
                          (isManager || isOpsOfficer) ? (
                            <button
                              onClick={() => triggerApproveAccount(a)}
                              className="text-[11px] py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-2xs transition-colors"
                            >
                              Approve
                            </button>
                          ) : null
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold">Active</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {accountAppsQueue.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No pending account applications.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 2: DASHBOARD A — KYC COMPLIANCE & VERIFICATION QUEUE */}
        {/* ========================================================================= */}
        {activeTab === 'kyc' && (
          <div className="space-y-5">
            
            {/* Header & Metric Strip */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">KYC Compliance & Verification Queue</h2>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {kycQueue.filter(k => k.status === 'UNDER_REVIEW' || k.status === 'SUBMITTED').length} Pending Inspection
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Statutory customer due diligence, CKYC registry verification, identity document hash checking, and risk categorization.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, KYC ID, CIF, PAN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9D1D27] w-64"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Status and Risk Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase text-slate-400 mr-1">Status:</span>
                  {[
                    { id: 'ALL', label: 'All Cases', count: kycQueue.length },
                    { id: 'PENDING', label: 'Pending Review', count: kycQueue.filter(k => k.status === 'UNDER_REVIEW' || k.status === 'SUBMITTED').length },
                    { id: 'APPROVED', label: 'Verified & Approved', count: kycQueue.filter(k => k.status === 'APPROVED').length },
                    { id: 'REJECTED', label: 'Rejected', count: kycQueue.filter(k => k.status === 'REJECTED').length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setKycStatusFilter(tab.id)}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                        kycStatusFilter === tab.id
                          ? 'bg-[#9D1D27] text-white shadow-2xs font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Risk Filter:</span>
                  <select
                    value={kycRiskFilter}
                    onChange={(e) => setKycRiskFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700"
                  >
                    <option value="ALL">All Risk Levels</option>
                    <option value="LOW">Low Risk</option>
                    <option value="MEDIUM">Medium Risk</option>
                    <option value="HIGH">High Risk</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Master-Detail Operational Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Cases Table / List (7 Columns) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">KYC Ref</th>
                      <th className="py-3 px-4">Customer Name & CIF</th>
                      <th className="py-3 px-4">Submission Date</th>
                      <th className="py-3 px-4">Risk Class</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kycQueue
                      .filter(k => {
                        if (kycStatusFilter === 'PENDING') return k.status === 'UNDER_REVIEW' || k.status === 'SUBMITTED';
                        if (kycStatusFilter === 'APPROVED') return k.status === 'APPROVED';
                        if (kycStatusFilter === 'REJECTED') return k.status === 'REJECTED';
                        return true;
                      })
                      .filter(k => {
                        if (kycRiskFilter !== 'ALL') return k.riskCategory === kycRiskFilter;
                        return true;
                      })
                      .filter(k => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          k.fullName?.toLowerCase().includes(q) ||
                          k.kycCaseId?.toLowerCase().includes(q) ||
                          k.customerId?.toLowerCase().includes(q) ||
                          k.occupation?.toLowerCase().includes(q)
                        );
                      })
                      .map(k => {
                        const isSelected = selectedKycCase?.kycCaseId === k.kycCaseId;
                        return (
                          <tr
                            key={k.kycCaseId}
                            onClick={() => setSelectedKycCase(k)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-red-50/60 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {k.kycCaseId}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block">{k.fullName}</span>
                              <span className="text-[11px] font-mono text-slate-500">{k.customerId}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-mono">
                              {k.submittedAt ? k.submittedAt.split('T')[0] : '2026-10-15'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                k.riskCategory === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                                k.riskCategory === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {k.riskCategory || 'LOW'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {getStatusBadge(k.status)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedKycCase(k);
                                }}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded transition-colors ${
                                  isSelected
                                    ? 'bg-[#9D1D27] text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {kycQueue.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No KYC cases available in queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right Column: Case Inspection Panel (5 Columns) */}
              <div className="lg:col-span-5">
                {selectedKycCase ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 sticky top-24">
                    
                    {/* Panel Header */}
                    <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">KYC Case Dossier</span>
                        <h4 className="text-base font-extrabold text-slate-900">{selectedKycCase.fullName}</h4>
                        <span className="text-xs font-mono text-slate-500">{selectedKycCase.kycCaseId} • CIF: {selectedKycCase.customerId}</span>
                      </div>
                      {getStatusBadge(selectedKycCase.status)}
                    </div>

                    {/* Customer Profile Attributes */}
                    <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500">Occupation:</span>
                        <span className="text-slate-900 font-semibold">{selectedKycCase.occupation}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500">Annual Income Tier:</span>
                        <span className="text-slate-900 font-semibold">{selectedKycCase.annualIncomeRange?.replace('_', ' - ')}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500">Aadhaar Statutory Consent:</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 inline" />
                          {selectedKycCase.aadhaarConsent ? 'Recorded (UIDAI Tokenized)' : 'Consent Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500">Submission Timestamp:</span>
                        <span className="text-slate-700 font-mono">{selectedKycCase.submittedAt || '2026-10-15T10:30:00Z'}</span>
                      </div>
                    </div>

                    {/* Document Verification Inspection */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                        Verified Identity Documents
                      </span>
                      <div className="space-y-1.5">
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-slate-800">1. Permanent Account Number (PAN)</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            CKYC Match
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-slate-800">2. Proof of Address (Electricity Bill)</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Geocoded Valid
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Form & Compliance Decision */}
                    {selectedKycCase.status !== 'APPROVED' ? (
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Assign Risk Category
                          </label>
                          <select
                            value={kycRisk}
                            onChange={(e) => setKycRisk(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                          >
                            <option value="LOW">LOW — Standard Retail Salaried</option>
                            <option value="MEDIUM">MEDIUM — High Turnover / MSME Trader</option>
                            <option value="HIGH">HIGH — Enhanced Due Diligence (EDD) Required</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Compliance Review Notes
                          </label>
                          <textarea
                            rows={2}
                            value={kycRemarks}
                            onChange={(e) => setKycRemarks(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                          />
                        </div>

                        {(isManager || isKycOfficer) ? (
                          <div className="space-y-2 pt-1">
                            <Button
                              variant="primary"
                              onClick={() => triggerApproveKyc(selectedKycCase)}
                              className="w-full py-2.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Approve & Authorize KYC
                            </Button>

                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={() => triggerRequestKycInfo(selectedKycCase)}
                                className="py-2 text-xs border-amber-300 text-amber-800 hover:bg-amber-50 font-bold"
                              >
                                <Info className="w-3.5 h-3.5 mr-1" />
                                Request Info
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => triggerRejectKyc(selectedKycCase)}
                                className="py-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-bold"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                Reject Case
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800 font-semibold">
                            Compliance Officer Clearance Required for KYC Decisions
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                        <div className="text-emerald-800 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>KYC Statutory Status: Approved & Verified</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          Reviewed by {selectedKycCase.approvedBy || 'compliance.officer@finedge.bank'} on {selectedKycCase.approvedAt?.split('T')[0] || '2026-10-28'}.
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs shadow-2xs space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">No KYC Case Selected</p>
                    <p className="text-slate-400 max-w-xs mx-auto">
                      Select an application row from the queue to inspect verified documents and record statutory decisions.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 3: DASHBOARD B — ACCOUNT APPLICATIONS UNDERWRITING QUEUE */}
        {/* ========================================================================= */}
        {activeTab === 'account-applications' && (
          <div className="space-y-5">
            
            {/* Header & Metric Strip */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Account Opening Underwriting Queue</h2>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {accountAppsQueue.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'PENDING_APPROVAL').length} Awaiting Activation
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deposit account underwriting, initial funding verification, nominee validation, and core banking activation.
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search application ID, customer, product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9D1D27] w-64"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Status and Product Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase text-slate-400 mr-1">Status:</span>
                  {[
                    { id: 'ALL', label: 'All Applications', count: accountAppsQueue.length },
                    { id: 'PENDING', label: 'Pending Approval', count: accountAppsQueue.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'PENDING_APPROVAL').length },
                    { id: 'APPROVED', label: 'Approved & Active', count: accountAppsQueue.filter(a => a.status === 'APPROVED').length },
                    { id: 'REJECTED', label: 'Rejected', count: accountAppsQueue.filter(a => a.status === 'REJECTED').length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAccountStatusFilter(tab.id)}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                        accountStatusFilter === tab.id
                          ? 'bg-[#9D1D27] text-white shadow-2xs font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Product:</span>
                  <select
                    value={accountProductFilter}
                    onChange={(e) => setAccountProductFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700"
                  >
                    <option value="ALL">All Deposit Products</option>
                    <option value="SAVINGS">Savings Accounts</option>
                    <option value="CURRENT">Current Accounts</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Enterprise Table of Applications */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Customer Name & CIF</th>
                    <th className="py-3 px-4">Deposit Product</th>
                    <th className="py-3 px-4">Initial Funding</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">KYC Clearance</th>
                    <th className="py-3 px-4">Underwriting Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountAppsQueue
                    .filter(a => {
                      if (accountStatusFilter === 'PENDING') return a.status === 'UNDER_REVIEW' || a.status === 'PENDING_APPROVAL';
                      if (accountStatusFilter === 'APPROVED') return a.status === 'APPROVED';
                      if (accountStatusFilter === 'REJECTED') return a.status === 'REJECTED';
                      return true;
                    })
                    .filter(a => {
                      if (accountProductFilter !== 'ALL') return a.productCode?.includes(accountProductFilter);
                      return true;
                    })
                    .filter(a => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        a.customerName?.toLowerCase().includes(q) ||
                        a.accountApplicationId?.toLowerCase().includes(q) ||
                        a.customerId?.toLowerCase().includes(q) ||
                        a.productName?.toLowerCase().includes(q)
                      );
                    })
                    .map(a => {
                      // Lookup customer's actual KYC status
                      const cust = customersList.find(c => c.customerId === a.customerId);
                      const isKycApproved = cust?.kycStatus === 'APPROVED';

                      return (
                        <tr key={a.accountApplicationId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {a.accountApplicationId}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{a.customerName}</span>
                            <span className="text-[11px] font-mono text-slate-500">{a.customerId}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-semibold">
                            {a.productName}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                            ₹ {Number(a.initialFundingAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {a.submittedAt ? a.submittedAt.split('T')[0] : '2026-10-18'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isKycApproved ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3" />
                                KYC Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(a.status)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setUnderwriteApp(a)}
                                className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                              >
                                Review Dossier
                              </button>

                              {a.status !== 'APPROVED' && (isManager || isOpsOfficer) && (
                                <button
                                  onClick={() => triggerApproveAccount(a)}
                                  className="text-[11px] font-bold px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded shadow-2xs transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {accountAppsQueue.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No account applications found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 4: CARD APPLICATIONS QUEUE */}
        {/* ========================================================================= */}
        {activeTab === 'card-applications' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Card Issuance & Dispatch Queue</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assess debit & metal credit card applications, link to active accounts, and dispatch card plastic.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search card application ID, customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9D1D27] w-64"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Card App ID</th>
                    <th className="py-3 px-4">Customer Name & CIF</th>
                    <th className="py-3 px-4">Card Variant</th>
                    <th className="py-3 px-4">Linked Account</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cardAppsQueue
                    .filter(c => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        c.customerName?.toLowerCase().includes(q) ||
                        c.cardApplicationId?.toLowerCase().includes(q) ||
                        c.cardName?.toLowerCase().includes(q)
                      );
                    })
                    .map(c => (
                      <tr key={c.cardApplicationId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.cardApplicationId}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{c.customerName}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{c.cardName}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{c.linkedAccountId}</td>
                        <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          {c.status !== 'APPROVED' ? (
                            (isManager || isOpsOfficer) ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => triggerApproveCard(c)}
                                  className="text-[11px] font-bold px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded shadow-2xs transition-colors"
                                >
                                  Approve & Issue
                                </button>
                                <button
                                  onClick={() => triggerRejectCard(c)}
                                  className="text-[11px] font-bold px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : null
                          ) : (
                            <span className="text-xs text-emerald-700 font-bold">Issued & Dispatched</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {cardAppsQueue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No card issuance requests in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 5: CUSTOMER DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'customers' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Registered Customer Directory</h2>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {customersList.length} CIF Records
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Query full customer master records, tax IDs, compliance risk tiers, and customer contact information.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, PAN, email, CIF..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9D1D27] w-64"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="bg-[#9D1D27] hover:bg-[#7A1620] text-white font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Onboard Customer
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Customer ID</th>
                    <th className="py-3 px-4">Legal Name</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">PAN ID</th>
                    <th className="py-3 px-4">Occupation & City</th>
                    <th className="py-3 px-4">KYC Status</th>
                    <th className="py-3 px-4">Risk Tier</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customersList
                    .filter(c => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        c.fullName?.toLowerCase().includes(q) ||
                        c.email?.toLowerCase().includes(q) ||
                        c.mobileNumber?.includes(q) ||
                        c.customerId?.toLowerCase().includes(q) ||
                        c.pan?.toLowerCase().includes(q)
                      );
                    })
                    .map(c => (
                      <tr key={c.customerId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.customerId}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{c.fullName}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-800 block">{c.email}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{c.mobileNumber}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{c.pan || 'N/A'}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-800 block font-medium">{c.occupation || 'Salaried'}</span>
                          <span className="text-[11px] text-slate-500">{c.address?.city || 'Mumbai'}, {c.address?.state || 'MH'}</span>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(c.kycStatus)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.riskCategory === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                            c.riskCategory === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {c.riskCategory || 'LOW'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">{c.createdAt?.split('T')[0] || '2026-10-15'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 6: STAFF USER MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'users' && isManager && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Internal Staff Management</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provision bank officers, manage role delegations, and audit active staff accounts.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddStaffModal(true)}
                  className="bg-[#9D1D27] hover:bg-[#7A1620] text-white font-bold text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Provision Staff User
                </Button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Corporate Email</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map(s => (
                    <tr key={s.staffId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.staffId}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.fullName}</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.email}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.department}</td>
                      <td className="py-3.5 px-4 font-bold text-[#9D1D27]">{s.roleTitle}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {s.permissions?.length || 0} permissions
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {s.role !== 'BANK_MANAGER' && (
                          <button
                            onClick={() => handleToggleStaffStatus(s.staffId, s.status)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded transition-colors ${
                              s.status === 'ACTIVE'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
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
        {/* MODULE 7: ROLE-BASED ACCESS CONTROL (RBAC) MATRIX */}
        {/* ========================================================================= */}
        {activeTab === 'roles' && isManager && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900">Role-Based Access Control (RBAC) Matrix</h2>
              <p className="text-xs text-slate-500">
                Grant or revoke granular permissions across customer records, KYC operations, account underwriting, and audit trails.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Employee Selection List */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                  Select Staff Member
                </h3>
                <div className="space-y-2">
                  {staffList.map(st => {
                    const isSelected = selectedStaffId === st.staffId;
                    return (
                      <div
                        key={st.staffId}
                        onClick={() => setSelectedStaffId(st.staffId)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-red-50/70 border-[#9D1D27] text-slate-900 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-900">{st.fullName}</p>
                        <p className="text-[11px] text-slate-500">{st.email} • {st.roleTitle}</p>
                        <span className="text-[10px] font-mono text-[#9D1D27] font-semibold mt-1 block">
                          {st.permissions?.length || 0} active permissions
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Effective Permissions: {currentStaff?.fullName}
                    </h3>
                    <p className="text-xs text-slate-500">Toggle permissions to update delegated security clearance immediately.</p>
                  </div>
                  <Badge variant="warning">{currentStaff?.permissions?.length || 0} Enabled</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[550px] overflow-y-auto pr-1">
                  {allPermissions.map(p => {
                    const hasPerm = currentStaff?.permissions?.includes(p.code);
                    return (
                      <div
                        key={p.code}
                        onClick={() => handleTogglePermission(p.code)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all flex items-start justify-between ${
                          hasPerm
                            ? 'bg-red-50/50 border-[#9D1D27]/40 text-slate-900 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9D1D27] block">{p.module}</span>
                          <h4 className="text-xs font-bold text-slate-900">{p.label}</h4>
                          <span className="text-[10px] font-mono text-slate-400 block">{p.code}</span>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border mt-0.5 ${
                          hasPerm ? 'bg-[#9D1D27] border-[#9D1D27] text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {hasPerm && <Check className="w-3 h-3 stroke-[3]" />}
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
        {/* MODULE 8: SECURITY AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Immutable Security Audit Trail</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tamper-evident operational ledger recording staff administrative decisions, KYC approvals, and core banking events.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search action, user, log ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9D1D27] w-64"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Log ID</th>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Acting Officer</th>
                    <th className="py-3 px-4">Action Token</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditList
                    .filter(l => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        l.action?.toLowerCase().includes(q) ||
                        l.actor?.toLowerCase().includes(q) ||
                        l.logId?.toLowerCase().includes(q) ||
                        l.details?.toLowerCase().includes(q)
                      );
                    })
                    .map(l => (
                      <tr key={l.logId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{l.logId}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{l.timestamp}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{l.actor}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                            {l.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{l.target}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{l.details}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: ACCOUNT UNDERWRITING INSPECTION */}
      {/* ========================================================================= */}
      {underwriteApp && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border-slate-200 shadow-2xl p-6 rounded-2xl space-y-4">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Underwriting Dossier</span>
                <h3 className="text-base font-extrabold text-slate-900">{underwriteApp.productName}</h3>
                <span className="text-xs font-mono text-slate-500">App ID: {underwriteApp.accountApplicationId}</span>
              </div>
              <button onClick={() => setUnderwriteApp(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ✕
              </button>
            </div>

            {/* Applicant Summary */}
            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{underwriteApp.customerName} ({underwriteApp.customerId})</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Initial Deposit Amount:</span>
                <span className="font-bold text-slate-900 font-mono">₹ {Number(underwriteApp.initialFundingAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Nominee Designation:</span>
                <span className="font-medium text-slate-800">
                  {underwriteApp.nominee?.fullName || 'N/A'} ({underwriteApp.nominee?.relationship || 'None'})
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Customer KYC Prerequisite:</span>
                {customersList.find(c => c.customerId === underwriteApp.customerId)?.kycStatus === 'APPROVED' ? (
                  <span className="font-bold text-emerald-700">✓ KYC Approved & Verified</span>
                ) : (
                  <span className="font-bold text-amber-700">⚠ KYC Incomplete / Under Review</span>
                )}
              </div>
            </div>

            {/* Underwriting Checklist */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">Underwriting Validation Checklist</span>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Initial funding satisfies minimum balance criteria for {underwriteApp.productName}.</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Nominee details validated against statutory inheritance formats.</span>
              </div>
            </div>

            {/* Action Buttons */}
            {underwriteApp.status !== 'APPROVED' ? (
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                {(isManager || isOpsOfficer) ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => triggerApproveAccount(underwriteApp)}
                      className="flex-1 py-2.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Approve & Open Account
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => triggerRejectAccount(underwriteApp)}
                      className="flex-1 py-2.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-bold rounded-lg"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Decline Application
                    </Button>
                  </>
                ) : (
                  <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800 font-medium">
                    Operations Clearance Required for Account Approvals
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center text-xs text-emerald-800 font-bold">
                Application Approved & Account Active
              </div>
            )}

          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION / REASON CAPTURE DIALOG */}
      {/* ========================================================================= */}
      {confirmActionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl p-6 rounded-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                confirmActionModal.isDanger ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {confirmActionModal.isDanger ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{confirmActionModal.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{confirmActionModal.message}</p>
                {confirmActionModal.warningText && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 font-semibold">
                    {confirmActionModal.warningText}
                  </div>
                )}
              </div>
            </div>

            {confirmActionModal.hasInput && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block uppercase">
                  {confirmActionModal.inputLabel || 'Reason / Audit Justification'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-[#9D1D27]"
                  placeholder="Provide explicit operational or compliance justification..."
                />
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmActionModal(null)}
                className="flex-1 py-2 text-xs border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={async () => {
                  const onConfirm = confirmActionModal.onConfirm;
                  setConfirmActionModal(null);
                  await onConfirm(rejectionReason);
                }}
                className={`flex-1 py-2 text-xs font-bold text-white ${
                  confirmActionModal.isDanger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {confirmActionModal.actionLabel || 'Confirm Action'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEPARATED DEV & SANDBOX TOOLS */}
      {/* ========================================================================= */}
      {showDevToolsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">Developer & Sandbox Controls</h3>
              </div>
              <button onClick={() => setShowDevToolsModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              These controls are strictly segregated from ordinary banking operations and are provided for demo evaluation and testing.
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Reseed Realistic Test Environment</h4>
              <p className="text-[11px] text-slate-500">
                Resets the local database to the default seed containing 8 realistic customers, pending KYC verification records, account opening applications, and transactions.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm('Reseed local database with default realistic customers, accounts, and KYC applications?')) {
                    managerService.resetDemoData();
                    setShowDevToolsModal(false);
                    await loadAllData();
                    showNotice('Database reseeded with 8 demo customers and complete workflows!', 'success');
                  }
                }}
                className="w-full text-xs font-bold border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100"
              >
                <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                Reseed Demo Data
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDevToolsModal(false)} className="text-xs">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROVISION STAFF USER */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Provision Internal Staff Member</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Shalini Nair"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="shalini.nair@finedge.bank"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Department</label>
                <select
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                >
                  <option value="Operations">Branch Operations</option>
                  <option value="Compliance & AML">Compliance & AML</option>
                  <option value="Credit & Underwriting">Credit & Underwriting</option>
                  <option value="Card Operations">Card Operations</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Initial Role Template</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                >
                  <option value="KYC_OFFICER">KYC Verification Officer</option>
                  <option value="ACCOUNT_OPS">Account & Card Operations Specialist</option>
                  <option value="BANK_MANAGER">Branch Manager</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowAddStaffModal(false)} className="flex-1 py-2 text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1 py-2 text-xs bg-[#9D1D27] hover:bg-[#7A1620] text-white font-bold">
                  Provision User
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ONBOARD NEW CUSTOMER */}
      {/* ========================================================================= */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#9D1D27]" />
                <h3 className="text-sm font-extrabold text-slate-900">Direct Customer CIF Onboarding</h3>
              </div>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Siddharth Joshi"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Primary Email</label>
                  <input
                    type="email"
                    required
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="siddharth@example.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Mobile Number</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newCustMobile}
                    onChange={(e) => setNewCustMobile(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">PAN Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newCustPan}
                    onChange={(e) => setNewCustPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Occupation</label>
                  <select
                    value={newCustOccupation}
                    onChange={(e) => setNewCustOccupation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  >
                    <option value="SALARIED">Salaried Employee</option>
                    <option value="BUSINESS">Business Owner</option>
                    <option value="PROFESSIONAL">Independent Professional</option>
                    <option value="RETIRED">Senior / Retired</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">Annual Income Range</label>
                  <select
                    value={newCustIncome}
                    onChange={(e) => setNewCustIncome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  >
                    <option value="500000_1000000">₹ 5 - 10 Lakhs</option>
                    <option value="1000000_1500000">₹ 10 - 15 Lakhs</option>
                    <option value="1500000_2500000">₹ 15 - 25 Lakhs</option>
                    <option value="2500000_5000000">₹ 25 - 50 Lakhs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">City</label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">State</label>
                  <input
                    type="text"
                    value={newCustState}
                    onChange={(e) => setNewCustState(e.target.value)}
                    placeholder="e.g. MAHARASHTRA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowAddCustomerModal(false)} className="flex-1 py-2 text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1 py-2 text-xs bg-[#9D1D27] hover:bg-[#7A1620] text-white font-bold">
                  Register Customer CIF
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
