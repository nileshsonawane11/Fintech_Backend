import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button } from '../../components/common/UIComponents';
import { accountService } from '../../services/accountService';
import { cardService } from '../../services/cardService';
import { customerService } from '../../services/customerService';
import { apiRequest } from '../../services/api';
import { 
  CreditCard, 
  Clock, 
  FileText, 
  CheckCircle2, 
  LogOut, 
  Send, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  User, 
  PlusCircle, 
  Bell, 
  HelpCircle, 
  Building, 
  Download, 
  AlertTriangle, 
  XCircle, 
  FileCheck 
} from 'lucide-react';

export const PortalDashboardPage = () => {
  const { user, accounts, cards, applications, logout, refreshCustomerData } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view: 'overview' | 'accounts' | 'cards' | 'apply-account' | 'apply-card' | 'kyc' | 'applications' | 'notifications' | 'support' | 'profile'
  const currentTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [balanceVisible, setBalanceVisible] = useState(true);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferBeneficiary, setTransferBeneficiary] = useState('Sunita Sharma (**********9012)');
  const [transferMode, setTransferMode] = useState('IMPS');
  const [transferRemarks, setTransferRemarks] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(null);
  const [transferError, setTransferError] = useState('');

  // Apply Account State
  const [accProductCode, setAccProductCode] = useState('SAVINGS_REGULAR');
  const [accInitialFunding, setAccInitialFunding] = useState('25000');
  const [nomineeName, setNomineeName] = useState('Sunita Sharma');
  const [nomineeRelation, setNomineeRelation] = useState('SPOUSE');
  const [nomineeDob, setNomineeDob] = useState('1997-03-21');
  const [nomineePhone, setNomineePhone] = useState('9812345678');
  const [accApplyLoading, setAccApplyLoading] = useState(false);
  const [accApplySuccess, setAccApplySuccess] = useState(null);

  // Apply Card State
  const [cardType, setCardType] = useState('METAL_CREDIT');
  const [cardLinkedAccount, setCardLinkedAccount] = useState('ACC-1001');
  const [cardApplyLoading, setCardApplyLoading] = useState(false);
  const [cardApplySuccess, setCardApplySuccess] = useState(null);

  // Card Controls State
  const [activeCardId, setActiveCardId] = useState('CARD-3001');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('LOST');
  const [blockRemarks, setBlockRemarks] = useState('');

  // KYC Submission State
  const [kycGender, setKycGender] = useState('MALE');
  const [kycPan, setKycPan] = useState('ABCDE1234F');
  const [kycAadhaarConsent, setKycAadhaarConsent] = useState(true);
  const [kycOccupation, setKycOccupation] = useState('SALARIED');
  const [kycIncome, setKycIncome] = useState('1000000_1500000');
  const [kycAddress1, setKycAddress1] = useState('402, FinEdge Horizon Towers');
  const [kycCity, setKycCity] = useState('Mumbai');
  const [kycState, setKycState] = useState('MAHARASHTRA');
  const [kycPin, setKycPin] = useState('400051');
  const [uploadedDocs, setUploadedDocs] = useState([
    { type: 'PAN', name: 'pan-card.pdf', size: '245 KB', uploaded: true },
    { type: 'ADDRESS_PROOF', name: 'electricity-bill.pdf', size: '512 KB', uploaded: true }
  ]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycSuccess, setKycSuccess] = useState(null);

  // Support Ticket State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('PAYMENT_ISSUE');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(null);

  // Notifications State
  const [notificationsList, setNotificationsList] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/portal/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Load notifications
    apiRequest('/api/v1/notifications')
      .then(res => setNotificationsList(res.data || []))
      .catch(() => {});
  }, []);

  if (!user) return null;

  // Selected Card
  const currentCard = cards.find(c => c.cardId === activeCardId) || cards[0];

  // Transfer Handler
  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess(null);
    if (!transferAmount || Number(transferAmount) <= 0) {
      setTransferError('Please enter a valid transfer amount.');
      return;
    }

    setTransferLoading(true);
    try {
      const res = await accountService.initiateTransfer({
        debitAccountId: accounts[0]?.accountId || 'ACC-1001',
        beneficiaryId: 'BEN-778899',
        amount: transferAmount,
        remarks: transferRemarks || `Payment to ${transferBeneficiary}`,
        transferMode
      });
      setTransferSuccess(res);
      setTransferAmount('');
      setTransferRemarks('');
      refreshCustomerData();
    } catch (err) {
      setTransferError(err.detail || 'Transfer failed. Please check available balance and limits.');
    } finally {
      setTransferLoading(false);
    }
  };

  // Account Apply Handler
  const handleApplyAccount = async (e) => {
    e.preventDefault();
    setAccApplyLoading(true);
    setAccApplySuccess(null);
    try {
      const res = await accountService.applyForAccount({
        productCode: accProductCode,
        initialFundingAmount: accInitialFunding,
        nominee: {
          fullName: nomineeName,
          relationship: nomineeRelation,
          dateOfBirth: nomineeDob,
          mobileNumber: nomineePhone
        }
      });
      setAccApplySuccess(res);
      refreshCustomerData();
    } catch (err) {
      alert(err.detail || 'Application failed');
    } finally {
      setAccApplyLoading(false);
    }
  };

  // Card Apply Handler
  const handleApplyCard = async (e) => {
    e.preventDefault();
    setCardApplyLoading(true);
    setCardApplySuccess(null);
    try {
      const res = await cardService.applyForCard({
        cardType,
        cardName: cardType === 'METAL_CREDIT' ? 'Ashva Metal Credit Card' : 'FinEdge Millennia Cashback Card',
        linkedAccountId: cardLinkedAccount
      });
      setCardApplySuccess(res);
      refreshCustomerData();
    } catch (err) {
      alert(err.detail || 'Card application failed');
    } finally {
      setCardApplyLoading(false);
    }
  };

  // Card Control Toggle
  const handleToggleCardControl = async (controlKey) => {
    if (!currentCard) return;
    const updated = {
      ...currentCard.controls,
      [controlKey]: !currentCard.controls[controlKey]
    };
    await cardService.updateControls(currentCard.cardId, updated);
    refreshCustomerData();
  };

  // Card Block Handler
  const handleBlockCard = async (e) => {
    e.preventDefault();
    if (!currentCard) return;
    try {
      await cardService.blockCard(currentCard.cardId, {
        reason: blockReason,
        remarks: blockRemarks
      });
      setShowBlockModal(false);
      refreshCustomerData();
      alert(`Card ${currentCard.cardId} has been permanently blocked as per security guidelines.`);
    } catch (err) {
      alert(err.detail || 'Failed to block card');
    }
  };

  // KYC Submit Handler
  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    setKycLoading(true);
    setKycSuccess(null);
    try {
      const res = await customerService.submitKyc({
        fullName: user.name || 'Vikramaditya Sharma',
        gender: kycGender,
        pan: kycPan,
        aadhaarConsent: kycAadhaarConsent,
        occupation: kycOccupation,
        annualIncomeRange: kycIncome,
        address: {
          addressLine1: kycAddress1,
          city: kycCity,
          state: kycState,
          postalCode: kycPin,
          country: 'INDIA'
        },
        documentReferences: uploadedDocs.map(d => ({
          documentType: d.type,
          documentReferenceId: 'doc-' + Math.floor(100 + Math.random() * 900)
        }))
      });
      setKycSuccess(res);
      refreshCustomerData();
    } catch (err) {
      alert(err.detail || 'KYC submission failed');
    } finally {
      setKycLoading(false);
    }
  };

  // Support Ticket Handler
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc) return;
    try {
      const res = await apiRequest('/api/v1/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category: ticketCategory,
          subject: ticketSubject,
          description: ticketDesc
        })
      });
      setTicketSuccess(res);
      setTicketSubject('');
      setTicketDesc('');
    } catch (err) {
      alert('Error creating support ticket');
    }
  };

  // Primary Account Balance Calculations
  const primaryAccount = accounts[0];
  const totalBalance = accounts.reduce((acc, a) => acc + (a.balance?.availableBalance || 0), 0);

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6">
      <div className="max-w-7xl mx-auto px-4 space-y-6">

        {/* TOP EXECUTIVE BANNER */}
        <div className="bg-gradient-to-r from-[#1C1B1F] via-[#2A1719] to-[#450A0E] text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                FinEdge Priority Digital Banking
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 font-semibold border border-green-500/30">
                Live Session
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs text-gray-300 flex items-center gap-2">
              <span>Customer ID: <strong className="text-white">{user.customerId || 'CUS-100234'}</strong></span>
              <span>•</span>
              <span>KYC: <strong className="text-green-400 uppercase">{user.kycStatus || 'APPROVED'}</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTransferModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs py-2 px-4 font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Instant Transfer
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('apply-account')}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30 text-xs py-2 px-4 font-bold"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Open Account
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-200 border-red-500/20 text-xs py-2 px-3"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
            </Button>
            <Link
              to="/manager/login"
              className="bg-slate-900/90 hover:bg-slate-950 text-cyan-300 border border-cyan-500/40 text-xs py-2 px-3.5 rounded-lg font-bold flex items-center shadow-xs transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Staff Portal ↗
            </Link>
          </div>
        </div>

        {/* CUSTOMER PORTAL NAVIGATION TABS */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 overflow-x-auto flex items-center gap-1 scrollbar-none text-xs font-bold text-gray-600">
          {[
            { id: 'overview', label: 'Dashboard', icon: Building },
            { id: 'accounts', label: 'My Accounts', icon: FileText, count: accounts.length },
            { id: 'cards', label: 'My Cards', icon: CreditCard, count: cards.length },
            { id: 'apply-account', label: 'Apply for Account', icon: PlusCircle },
            { id: 'apply-card', label: 'Apply for Card', icon: CreditCard },
            { id: 'kyc', label: 'KYC & Documents', icon: ShieldCheck },
            { id: 'applications', label: 'My Applications', icon: FileCheck, count: applications.length },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: notificationsList.filter(n => !n.read).length },
            { id: 'support', label: 'Help & Support', icon: HelpCircle },
            { id: 'profile', label: 'Profile & Settings', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#9D1D27] text-white shadow-sm font-extrabold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: DASHBOARD OVERVIEW */}
        {/* ========================================================================= */}
        {currentTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Balances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Net Balance</span>
                    <div className="flex items-center gap-2 mt-1">
                      <h2 className="text-3xl font-black text-[#1C1B1F]">
                        {balanceVisible ? `₹ ${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••••••'}
                      </h2>
                      <button onClick={() => setBalanceVisible(!balanceVisible)} className="text-gray-400 hover:text-gray-700">
                        {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Badge variant="success" className="font-bold">Active</Badge>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>Across {accounts.length} active account(s)</span>
                  <button onClick={() => setActiveTab('accounts')} className="text-[#9D1D27] font-bold hover:underline">
                    View Details →
                  </button>
                </div>
              </Card>

              <Card className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Active Cards</span>
                    <h2 className="text-3xl font-black text-[#1C1B1F] mt-1">
                      {cards.length} Cards
                    </h2>
                  </div>
                  <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>Ashva Metal & Platinum Debit</span>
                  <button onClick={() => setActiveTab('cards')} className="text-[#9D1D27] font-bold hover:underline">
                    Manage Controls →
                  </button>
                </div>
              </Card>

              <Card className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">KYC Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      <h2 className="text-2xl font-black text-green-700">
                        {user.kycStatus || 'APPROVED'}
                      </h2>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-green-100 text-green-800 rounded-xl flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>Risk Category: <strong>LOW</strong></span>
                  <button onClick={() => setActiveTab('kyc')} className="text-[#9D1D27] font-bold hover:underline">
                    Inspect KYC →
                  </button>
                </div>
              </Card>
            </div>

            {/* Main Accounts & Recent Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: My Accounts List */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Primary Accounts</h3>
                      <p className="text-xs text-gray-400">Savings & Current Accounts under customer portfolio</p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab('apply-account')} className="text-xs py-1.5 font-bold">
                      <PlusCircle className="w-3.5 h-3.5 mr-1" /> New Account
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {accounts.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-700">No active bank accounts found</p>
                        <p className="text-xs text-gray-500 mb-4">Open your first high-yield savings account in under 3 minutes.</p>
                        <Button variant="primary" onClick={() => setActiveTab('apply-account')} className="text-xs py-2">
                          Apply for Account Now
                        </Button>
                      </div>
                    ) : (
                      accounts.map(acc => (
                        <div key={acc.accountId} className="p-4 bg-gray-50/80 hover:bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900">{acc.productName}</span>
                              <Badge variant="neutral" className="text-[10px] uppercase font-bold">{acc.accountType}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 font-mono">
                              A/C: <span className="font-bold text-gray-800">{acc.accountNumber}</span> • {acc.accountId}
                            </p>
                            <p className="text-[11px] text-green-700 font-medium">
                              {acc.interestRate > 0 ? `Compounding Interest: ${acc.interestRate}% p.a. (Monthly Credit)` : 'Zero MAB Auto-Sweep Enabled'}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Available Balance</span>
                            <p className="text-xl font-black text-gray-900">
                              {balanceVisible ? `₹ ${(acc.balance?.availableBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••••••'}
                            </p>
                            <span className="text-[10px] text-gray-400">Ledger: ₹ {(acc.balance?.ledgerBalance || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Applications Pipeline Stepper */}
                <Card className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Active Application Stepper</h3>
                      <p className="text-xs text-gray-400">Real-time underwriting and document inspection tracking</p>
                    </div>
                    <button onClick={() => setActiveTab('applications')} className="text-xs font-bold text-[#9D1D27] hover:underline">
                      All Applications ({applications.length}) →
                    </button>
                  </div>

                  {applications.slice(0, 1).map(app => (
                    <div key={app.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{app.productType}</span>
                          <h4 className="text-sm font-bold text-gray-900">{app.productName}</h4>
                          <span className="text-xs font-mono text-gray-500">Ref: {app.id} • Submitted: {app.date}</span>
                        </div>
                        <Badge variant={app.status === 'APPROVED' ? 'success' : 'warning'} className="font-bold">
                          {app.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {app.steps.map((st, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className={`h-1.5 rounded-full ${st.completed ? 'bg-green-600' : 'bg-gray-200'}`} />
                            <p className="text-[10px] font-bold text-gray-800 line-clamp-1">{st.name}</p>
                            <span className="text-[9px] text-gray-400 block">{st.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </Card>
              </div>

              {/* Right Col: Quick Cards & Quick Transfer */}
              <div className="space-y-6">
                {/* Active Card Visual */}
                <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white rounded-3xl shadow-lg relative overflow-hidden border border-slate-700">
                  <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">FinEdge Privilege</span>
                      <h4 className="text-sm font-extrabold text-white mt-0.5">{currentCard?.cardName || 'Ashva Metal Credit Card'}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white">VISA</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-lg font-mono tracking-widest text-gray-200">
                      {currentCard?.maskedCardNumber || '•••• •••• •••• 1234'}
                    </p>
                    <div className="flex justify-between items-end text-xs text-gray-400">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block">Card Holder</span>
                        <span className="text-white font-bold">{user.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block">Expires</span>
                        <span className="text-white font-bold">{currentCard?.expiryMonth || '12'} / {currentCard?.expiryYear || '30'}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Quick Transfer Widget */}
                <Card className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900">Quick Fund Transfer</h3>
                    <Badge variant="neutral" className="text-[10px]">Zero Fee</Badge>
                  </div>
                  <form onSubmit={handleExecuteTransfer} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase">Beneficiary</label>
                      <select
                        value={transferBeneficiary}
                        onChange={(e) => setTransferBeneficiary(e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 mt-1 bg-white"
                      >
                        <option>Sunita Sharma (**********9012) — FinEdge</option>
                        <option>Acme Commercial Vendor (**********4412) — HDFC</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase">Amount (INR)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="₹ Amount"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 mt-1"
                      />
                    </div>

                    {transferError && <p className="text-xs text-red-600 font-semibold">{transferError}</p>}
                    {transferSuccess && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 space-y-1">
                        <p className="font-bold">Transfer Executed Successfully!</p>
                        <p>Ref: <span className="font-mono">{transferSuccess.paymentId}</span></p>
                      </div>
                    )}

                    <Button type="submit" variant="primary" disabled={transferLoading} className="w-full py-2 text-xs font-bold">
                      <Send className="w-3.5 h-3.5 mr-1" /> {transferLoading ? 'Processing...' : 'Transfer Now'}
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MY ACCOUNTS */}
        {/* ========================================================================= */}
        {currentTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">My Accounts Portfolio</h2>
                <p className="text-xs text-gray-500">Persisted bank accounts, balances, and real-time ledger statements</p>
              </div>
              <Button variant="primary" onClick={() => setActiveTab('apply-account')} className="text-xs py-2">
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Open Additional Account
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accounts.map(acc => (
                <Card key={acc.accountId} className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#9D1D27]">{acc.accountType}</span>
                      <h3 className="text-lg font-bold text-gray-900">{acc.productName}</h3>
                      <p className="text-xs font-mono text-gray-500">Account No: <strong>{acc.accountNumber}</strong></p>
                    </div>
                    <Badge variant="success" className="font-bold">{acc.status}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-4 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Available</span>
                      <span className="text-base font-extrabold text-gray-900">₹ {(acc.balance?.availableBalance || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Ledger</span>
                      <span className="text-base font-extrabold text-gray-700">₹ {(acc.balance?.ledgerBalance || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Hold</span>
                      <span className="text-base font-extrabold text-amber-700">₹ {(acc.balance?.holdBalance || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-gray-500">Opened: {acc.openedAt?.split('T')[0] || '2026-10-11'}</span>
                    <button
                      onClick={() => alert(`Generated ISO-20022 account statement for ${acc.accountId}. Ready for audit export.`)}
                      className="text-xs font-bold text-[#9D1D27] hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download e-Statement
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: MY CARDS & CONTROLS */}
        {/* ========================================================================= */}
        {currentTab === 'cards' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">My Cards & Security Controls</h2>
                <p className="text-xs text-gray-500">Manage spending limits, lock/unlock features, or report lost cards</p>
              </div>
              <Button variant="primary" onClick={() => setActiveTab('apply-card')} className="text-xs py-2">
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Apply for New Card
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card List & Visual */}
              <div className="space-y-4">
                {cards.map(card => (
                  <div
                    key={card.cardId}
                    onClick={() => setActiveCardId(card.cardId)}
                    className={`cursor-pointer p-5 rounded-3xl border transition-all ${
                      activeCardId === card.cardId
                        ? 'bg-slate-900 text-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                        : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{card.cardType}</span>
                        <h4 className="text-sm font-bold">{card.cardName}</h4>
                      </div>
                      <Badge variant={card.status === 'ACTIVE' ? 'success' : 'danger'}>{card.status}</Badge>
                    </div>
                    <p className="font-mono text-sm tracking-widest">{card.maskedCardNumber}</p>
                    <div className="flex justify-between text-xs mt-3 opacity-75">
                      <span>Valid: {card.expiryMonth}/{card.expiryYear}</span>
                      <span>Daily Limit: ₹ {card.controls?.dailyLimit?.toLocaleString('en-IN') || '50,000'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Controls Panel */}
              <div className="lg:col-span-2">
                <Card className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Security & Channel Controls</h3>
                      <p className="text-xs text-gray-400">Settings for {currentCard?.cardName} ({currentCard?.maskedCardNumber})</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowBlockModal(true)}
                      className="border-red-300 text-red-600 hover:bg-red-50 text-xs py-1.5 font-bold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Permanent Block Card
                    </Button>
                  </div>

                  <div className="space-y-4 pt-2">
                    {[
                      { key: 'onlineEnabled', title: 'Online E-Commerce Transactions', desc: 'Allow domestic online shopping, subscriptions, and payment gateways.' },
                      { key: 'internationalEnabled', title: 'International Usage (0% Forex)', desc: 'Enable foreign currency payments abroad and global online transactions.' },
                      { key: 'contactlessEnabled', title: 'Contactless Tap & Pay (NFC)', desc: 'Allow contactless payments up to ₹5,000 without entering card PIN.' },
                      { key: 'atmWithdrawalEnabled', title: 'ATM Cash Withdrawal', desc: 'Enable cash withdrawals at all domestic and global ATM networks.' }
                    ].map(ctl => {
                      const enabled = currentCard?.controls?.[ctl.key] ?? false;
                      return (
                        <div key={ctl.key} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">{ctl.title}</h4>
                            <p className="text-[11px] text-gray-500">{ctl.desc}</p>
                          </div>
                          <button
                            onClick={() => handleToggleCardControl(ctl.key)}
                            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                              enabled ? 'bg-green-600 justify-end' : 'bg-gray-300 justify-start'
                            }`}
                          >
                            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                          </button>
                        </div>
                      );
                    })}

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>Daily Spending Limit</span>
                        <span>₹ {(currentCard?.controls?.dailyLimit || 50000).toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="200000"
                        step="5000"
                        value={currentCard?.controls?.dailyLimit || 50000}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          cardService.updateControls(currentCard.cardId, {
                            ...currentCard.controls,
                            dailyLimit: val
                          }).then(() => refreshCustomerData());
                        }}
                        className="w-full accent-[#9D1D27]"
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: APPLY FOR ACCOUNT */}
        {/* ========================================================================= */}
        {currentTab === 'apply-account' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6">
              <div>
                <Badge variant="neutral" className="uppercase font-bold text-[10px]">Digital Onboarding</Badge>
                <h2 className="text-2xl font-black text-gray-900 mt-1">Open an Additional Account</h2>
                <p className="text-xs text-gray-500">Apply for instant account opening under your existing KYC-verified customer profile.</p>
              </div>

              {accApplySuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Account Application Submitted!</p>
                  <p>Application ID: <strong className="font-mono">{accApplySuccess.accountApplicationId}</strong></p>
                  <p>Estimated Activation: 48 Hours upon automated back-office verification.</p>
                </div>
              )}

              <form onSubmit={handleApplyAccount} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Select Account Product
                  </label>
                  <select
                    value={accProductCode}
                    onChange={(e) => setAccProductCode(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white"
                  >
                    <option value="SAVINGS_REGULAR">FIRST High-Yield Savings Account (7% p.a. Monthly Credit)</option>
                    <option value="CURRENT_BUSINESS">BRAVO Business Current Account (Auto-Sweep Liquidity)</option>
                    <option value="SAVINGS_SALARY">Corporate Executive Salary Account (Zero Balance)</option>
                    <option value="SAVINGS_STUDENT">Student Youth Savings Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Initial Funding Deposit (INR)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={accInitialFunding}
                    onChange={(e) => setAccInitialFunding(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-xl p-3"
                    placeholder="₹ 10,000"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Nominee Registration (Section 45ZA)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Nominee Full Name</label>
                      <input
                        type="text"
                        required
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">Relationship</label>
                      <select
                        value={nomineeRelation}
                        onChange={(e) => setNomineeRelation(e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white"
                      >
                        <option value="SPOUSE">Spouse</option>
                        <option value="PARENT">Parent</option>
                        <option value="CHILD">Child</option>
                        <option value="SIBLING">Sibling</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Button type="submit" variant="primary" disabled={accApplyLoading} className="w-full py-3 text-sm font-bold shadow-md">
                  {accApplyLoading ? 'Submitting Application...' : 'Submit Digital Account Application'}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: APPLY FOR CARD */}
        {/* ========================================================================= */}
        {currentTab === 'apply-card' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6">
              <div>
                <Badge variant="warning" className="uppercase font-bold text-[10px]">Instant Card Issuance</Badge>
                <h2 className="text-2xl font-black text-gray-900 mt-1">Apply for a New Card</h2>
                <p className="text-xs text-gray-500">Stainless-steel metal cards and lifetime-free debit/credit cards.</p>
              </div>

              {cardApplySuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Card Application Submitted!</p>
                  <p>Ref ID: <strong className="font-mono">{cardApplySuccess.cardApplicationId}</strong></p>
                  <p>Estimated Delivery: Within 5-7 business days via registered courier.</p>
                </div>
              )}

              <form onSubmit={handleApplyCard} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Select Card Variant
                  </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white"
                  >
                    <option value="METAL_CREDIT">Ashva Stainless Steel Metal Card (0% Forex Markup)</option>
                    <option value="MAYURA_METAL">Mayura Luxury Metal Card (Concierge & Airport Lounge)</option>
                    <option value="CREDIT">FinEdge Millennia (Lifetime Free, 5% Cashback)</option>
                    <option value="DEBIT">Platinum Contactless Debit Card (₹5 Lakh Limit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Link with Primary Account
                  </label>
                  <select
                    value={cardLinkedAccount}
                    onChange={(e) => setCardLinkedAccount(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white"
                  >
                    {accounts.map(a => (
                      <option key={a.accountId} value={a.accountId}>{a.productName} ({a.accountNumber})</option>
                    ))}
                  </select>
                </div>

                <Button type="submit" variant="primary" disabled={cardApplyLoading} className="w-full py-3 text-sm font-bold shadow-md">
                  {cardApplyLoading ? 'Processing Request...' : 'Submit Card Application'}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: KYC AND DOCUMENTS */}
        {/* ========================================================================= */}
        {currentTab === 'kyc' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="success" className="uppercase font-bold text-[10px]">RBI CKYC Compliant</Badge>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">Know Your Customer (KYC) Registry</h2>
                  <p className="text-xs text-gray-500">Government-verified identity information and encrypted document vault.</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-xl text-xs font-bold">
                  Status: {user.kycStatus || 'APPROVED'}
                </div>
              </div>

              {kycSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-900">
                  <p className="font-bold">KYC Case Submitted Successfully!</p>
                  <p>Case ID: <span className="font-mono">{kycSuccess.kycCaseId}</span>. Operations officer review initiated.</p>
                </div>
              )}

              <form onSubmit={handleSubmitKyc} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">PAN Card Number</label>
                    <input
                      type="text"
                      required
                      value={kycPan}
                      onChange={(e) => setKycPan(e.target.value.toUpperCase())}
                      className="w-full text-sm border border-gray-300 rounded-xl p-2.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Occupation Type</label>
                    <select
                      value={kycOccupation}
                      onChange={(e) => setKycOccupation(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-xl p-2.5 bg-white"
                    >
                      <option value="SALARIED">Salaried Employee</option>
                      <option value="BUSINESS">Business / Self-Employed</option>
                      <option value="PROFESSIONAL">Doctor / CA / Lawyer</option>
                      <option value="STUDENT">Student</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-700 block">Uploaded Identification Documents</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-[#9D1D27]" />
                          <div>
                            <p className="text-xs font-bold text-gray-900">{doc.name}</p>
                            <span className="text-[10px] text-gray-400">{doc.type} • {doc.size}</span>
                          </div>
                        </div>
                        <Badge variant="success" className="text-[10px]">Verified</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" variant="primary" disabled={kycLoading} className="w-full py-2.5 text-xs font-bold">
                  {kycLoading ? 'Submitting...' : 'Update & Re-verify KYC Credentials'}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7: MY APPLICATIONS TRACKER */}
        {/* ========================================================================= */}
        {currentTab === 'applications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Application Status & Audit Tracker</h2>
              <p className="text-xs text-gray-500">Live multi-stage pipeline status for accounts, credit lines, and cards</p>
            </div>

            <div className="space-y-4">
              {applications.map(app => (
                <Card key={app.id} className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">{app.productName}</h3>
                        <Badge variant="neutral" className="text-[10px] uppercase">{app.productType}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">Application Ref: {app.id} • Date: {app.date}</p>
                    </div>
                    <Badge variant={app.status === 'APPROVED' ? 'success' : 'warning'} className="font-bold">
                      {app.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    {app.steps.map((st, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {st.completed ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-amber-500" />}
                          <span className="text-xs font-bold text-gray-800">{st.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 pl-5.5">{st.date}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8: NOTIFICATIONS */}
        {/* ========================================================================= */}
        {currentTab === 'notifications' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900">Notifications & Alerts</h2>
            <div className="space-y-3">
              {notificationsList.map(n => (
                <Card key={n.notificationId} className="p-4 bg-white border border-gray-200 rounded-2xl flex items-start gap-3 shadow-sm">
                  <div className="w-9 h-9 bg-red-100 text-[#9D1D27] rounded-xl flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-gray-900">{n.title}</h4>
                      <span className="text-[10px] text-gray-400">{n.createdAt?.split('T')[0]}</span>
                    </div>
                    <p className="text-xs text-gray-600">{n.body}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 9: HELP & SUPPORT */}
        {/* ========================================================================= */}
        {currentTab === 'support' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Raise a Priority Service Request</h2>
                <p className="text-xs text-gray-500">Tickets are dispatched directly to the FinEdge customer grievance desk.</p>
              </div>

              {ticketSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-900">
                  <p className="font-bold">Support Ticket Created!</p>
                  <p>Ticket ID: <span className="font-mono">{ticketSuccess.ticketId}</span>. Expected SLA: 4 hours.</p>
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Issue Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white"
                  >
                    <option value="PAYMENT_ISSUE">Payment / Transfer Failure</option>
                    <option value="ACCOUNT_MAINTENANCE">Account Statement Inquiry</option>
                    <option value="CARD_DISPUTE">Card Dispute & Chargeback</option>
                    <option value="KYC_QUERY">KYC Document Help</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief summary of your inquiry"
                    className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Detailed Description</label>
                  <textarea
                    rows={4}
                    required
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Provide relevant transaction references, timestamps, or account numbers"
                    className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full py-2.5 text-xs font-bold">
                  Submit Service Request
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 10: PROFILE & SETTINGS */}
        {/* ========================================================================= */}
        {currentTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <div className="w-16 h-16 bg-[#9D1D27] text-white rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-md">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-xs text-gray-500 font-mono">Customer ID: {user.customerId || 'CUS-100234'}</p>
                  <Badge variant="success" className="text-[10px] mt-1">Verified Resident Indian</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-bold uppercase text-[10px]">Email Address</span>
                  <span className="font-bold text-gray-800">{user.email || 'vikram@example.com'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-bold uppercase text-[10px]">Registered Phone</span>
                  <span className="font-bold text-gray-800">{user.mobile || '+91 98765 43210'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-bold uppercase text-[10px]">Date of Birth</span>
                  <span className="font-bold text-gray-800">14 August 1995</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-bold uppercase text-[10px]">Risk Category</span>
                  <span className="font-bold text-green-700">LOW (Standard Retail)</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">Last login: {user.lastLogin}</span>
                <Button variant="outline" onClick={logout} className="text-xs py-1.5 text-red-600 border-red-200">
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Terminate Session
                </Button>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* MODAL: BLOCK CARD */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-extrabold text-gray-900">Permanent Card Deactivation</h3>
            </div>
            <p className="text-xs text-gray-500">
              Are you sure you want to permanently block card <span className="font-mono font-bold text-gray-800">{currentCard?.maskedCardNumber}</span>? This action cannot be reversed.
            </p>
            <form onSubmit={handleBlockCard} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Reason for Blocking</label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white"
                >
                  <option value="LOST">Card Lost</option>
                  <option value="STOLEN">Card Stolen / Compromised</option>
                  <option value="DAMAGED">Card Physically Damaged</option>
                  <option value="CUSTOMER_REQUEST">Voluntary Closure</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowBlockModal(false)} className="flex-1 py-2 text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1 py-2 text-xs bg-red-700 hover:bg-red-800 font-bold">
                  Confirm Block
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: INSTANT TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">Execute Instant Fund Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Select Beneficiary</label>
                <select
                  value={transferBeneficiary}
                  onChange={(e) => setTransferBeneficiary(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white"
                >
                  <option>Sunita Sharma (**********9012) — FinEdge Bank</option>
                  <option>Acme Commercial Vendor (**********4412) — HDFC</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Transfer Mode</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTransferMode('IMPS')}
                    className={`py-2 rounded-xl border ${transferMode === 'IMPS' ? 'bg-[#9D1D27] text-white border-[#9D1D27]' : 'bg-gray-50 text-gray-700'}`}
                  >
                    IMPS (Instant 24x7)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode('NEFT')}
                    className={`py-2 rounded-xl border ${transferMode === 'NEFT' ? 'bg-[#9D1D27] text-white border-[#9D1D27]' : 'bg-gray-50 text-gray-700'}`}
                  >
                    NEFT (Hourly Batch)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Amount (INR)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="₹ 15,000"
                  className="w-full text-sm border border-gray-300 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Remarks / Narrative</label>
                <input
                  type="text"
                  value={transferRemarks}
                  onChange={(e) => setTransferRemarks(e.target.value)}
                  placeholder="e.g. Monthly rent / family support"
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
                />
              </div>

              {transferError && <p className="text-xs text-red-600 font-semibold">{transferError}</p>}

              <Button type="submit" variant="primary" disabled={transferLoading} className="w-full py-2.5 text-xs font-bold">
                {transferLoading ? 'Authorizing Payment...' : 'Confirm & Authenticate Transfer'}
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
