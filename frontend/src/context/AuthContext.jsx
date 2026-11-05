import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { customerService } from '../services/customerService';
import { accountService } from '../services/accountService';
import { cardService } from '../services/cardService';
import { getAccessToken, getManagerToken, getDb, saveDb } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Customer Session
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('finedge_demo_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  // Manager / Staff Session
  const [managerUser, setManagerUser] = useState(() => {
    const saved = localStorage.getItem('finedge_manager_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  // Financial Data State
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync Customer Financial Data
  const refreshCustomerData = useCallback(async () => {
    if (!user && !getAccessToken()) return;
    try {
      const [profData, accsData, cardsData] = await Promise.all([
        customerService.getProfile().catch(() => null),
        accountService.getAccounts().catch(() => ({ data: [] })),
        cardService.getCards().catch(() => ({ data: [] }))
      ]);

      if (profData) {
        setProfile(profData);
        setUser(prev => ({
          ...prev,
          name: profData.fullName || prev?.name || 'Vikramaditya Sharma',
          email: profData.email || prev?.email,
          mobile: profData.mobileNumber || prev?.mobile,
          customerId: profData.customerId || prev?.customerId,
          kycStatus: profData.kycStatus || 'APPROVED'
        }));
      }

      const accList = accsData?.data || accsData || [];
      setAccounts(accList);
      const cardList = cardsData?.data || cardsData || [];
      setCards(cardList);

      // Load persistent applications isolated to this customer
      const db = getDb();
      const currentCustId = user?.customerId;
      const filteredAccApps = (db.accountApplications || []).filter(a => !currentCustId || a.customerId === currentCustId);
      const filteredCardApps = (db.cardApplications || []).filter(c => !currentCustId || c.customerId === currentCustId);
      const filteredLoanApps = (db.loanApplications || []).filter(l => !currentCustId || l.customerId === currentCustId);
      const filteredInvApps = (db.investmentApplications || []).filter(i => !currentCustId || i.customerId === currentCustId);

      const combinedApps = [
        ...filteredInvApps.map(i => ({
          id: i.applicationId || i.id,
          productType: 'Investment',
          productName: i.productName,
          applicantName: i.applicant?.fullName || i.applicantName || i.fullName || 'Applicant',
          status: i.status,
          date: i.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          steps: [
            { name: 'Submitted', completed: true, date: i.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0] },
            { name: 'Verification', completed: i.status !== 'REJECTED', date: i.status === 'APPROVED' || i.status === 'BOOKED' ? 'Verified' : 'In Review' },
            { name: 'Approved', completed: i.status === 'APPROVED' || i.status === 'BOOKED', date: i.status === 'APPROVED' || i.status === 'BOOKED' ? 'Approved' : 'Pending' },
            { name: 'Booked', completed: i.status === 'BOOKED', date: i.status === 'BOOKED' ? 'Booked' : 'Pending' }
          ]
        })),
        ...filteredLoanApps.map(l => ({
          id: l.applicationId || l.id,
          productType: 'Loan',
          productName: l.productName,
          applicantName: l.customer?.fullName || l.applicantName,
          status: l.status,
          date: l.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          steps: [
            { name: 'Application Submitted', completed: true, date: l.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0] },
            { name: 'Document Verification', completed: l.status !== 'REJECTED', date: l.status === 'APPROVED' || l.status === 'SANCTIONED' ? 'Verified' : 'In Review' },
            { name: 'Sanction & Underwriting', completed: l.status === 'APPROVED' || l.status === 'SANCTIONED' || l.status === 'DISBURSED', date: l.status === 'APPROVED' || l.status === 'SANCTIONED' ? 'Sanctioned' : 'Pending' },
            { name: 'Disbursal', completed: l.status === 'DISBURSED', date: l.status === 'DISBURSED' ? 'Disbursed' : 'Pending' }
          ]
        })),
        ...filteredAccApps.map(a => ({
          id: a.accountApplicationId,
          productType: 'Account',
          productName: a.productName,
          applicantName: a.customerName,
          status: a.status,
          date: a.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          steps: [
            { name: 'Application Submitted', completed: true, date: a.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0] },
            { name: 'Document Verification', completed: a.status !== 'REJECTED', date: a.status === 'APPROVED' ? 'Verified' : 'In Review' },
            { name: 'Underwriting Review', completed: a.status === 'APPROVED', date: a.status === 'APPROVED' ? 'Approved' : 'Pending' },
            { name: 'Account Activation', completed: a.status === 'APPROVED', date: a.status === 'APPROVED' ? 'Active' : 'Pending' }
          ]
        })),
        ...filteredCardApps.map(c => ({
          id: c.cardApplicationId,
          productType: 'Card',
          productName: c.cardName,
          applicantName: c.customerName,
          status: c.status,
          date: c.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          steps: [
            { name: 'Application Submitted', completed: true, date: c.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0] },
            { name: 'Eligibility Assessment', completed: true, date: 'Completed' },
            { name: 'Card Approval', completed: c.status === 'APPROVED', date: c.status === 'APPROVED' ? 'Approved' : 'Pending' },
            { name: 'Card Dispatch & Delivery', completed: c.status === 'APPROVED', date: c.status === 'APPROVED' ? 'Dispatched' : 'Pending' }
          ]
        }))
      ];
      setApplications(combinedApps);
    } catch (e) {
      // Quiet fallback
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('finedge_demo_user', JSON.stringify(user));
      if (user.customerId) {
        localStorage.setItem('finedge_session_customer_id', user.customerId);
      }
      refreshCustomerData();
    } else {
      localStorage.removeItem('finedge_demo_user');
      localStorage.removeItem('finedge_session_customer_id');
      setAccounts([]);
      setCards([]);
      setProfile(null);
    }
  }, [user, refreshCustomerData]);

  useEffect(() => {
    if (managerUser) {
      localStorage.setItem('finedge_manager_user', JSON.stringify(managerUser));
    } else {
      localStorage.removeItem('finedge_manager_user');
    }
  }, [managerUser]);

  // Customer Login with Two-Factor / MFA support
  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const res = await authService.login({ identifier, password: password || 'Str0ngPassw0rd!' });

      if (res.mfaRequired) {
        return { mfaRequired: true, mfaReferenceId: res.mfaReferenceId };
      }
      // const db = getDb();
      // const matched = db.customers.find(c =>
      //   (c.email && c.email.toLowerCase() === identifier.toLowerCase()) ||
      //   c.mobileNumber === identifier ||
      //   c.customerId === res.customerId
      // ) || db.customers[0];
      //
      const initialUser = {
        name: res.customer.fullName || 'FinEdge Customer',
        email: res.customer.email || identifier,
        mobile: res.customer.mobileNumber || identifier,
        customerId: res.customer.id || res.customerId,
        kycStatus: res.customer.status || 'APPROVED',
        lastLogin: new Date().toLocaleString('en-IN')
      };
      setUser(initialUser);
      return { success: true, user: initialUser };
    } finally {
      setLoading(false);
    }
  };

  // Complete MFA
  const verifyMfa = async (mfaReferenceId, otp) => {
    setLoading(true);
    try {
      const res = await authService.verifyMfa({ mfaReferenceId, otp });
      const db = getDb();
      const matched = db.customers.find(c => c.customerId === res.customerId) || db.customers[0];

      const initialUser = {
        name: matched.fullName || 'FinEdge Customer',
        email: matched.email || 'customer@finedge-mail.in',
        mobile: matched.mobileNumber || '9820198402',
        customerId: matched.customerId || res.customerId,
        kycStatus: matched.kycStatus || 'APPROVED',
        lastLogin: new Date().toLocaleString('en-IN')
      };
      setUser(initialUser);
      return { success: true, user: initialUser };
    } finally {
      setLoading(false);
    }
  };

  // Customer Registration
  const register = async (regData) => {
    setLoading(true);
    try {
      return await authService.register(regData);
    } finally {
      setLoading(false);
    }
  };

  // Verify Registration OTP
  const verifyOtp = async (otpData) => {
    setLoading(true);
    try {
      return await authService.verifyOtp(otpData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Manager Login
  const managerLogin = async (identifier, password) => {
    setLoading(true);
    try {
      const res = await authService.managerLogin({ identifier, password });
      const mgr = {
        staffId: res.staffId || 'STF-001',
        name: res.fullName || 'Staff Member',
        email: res.email || identifier,
        role: res.role || 'BANK_MANAGER',
        roleTitle: res.roleTitle || (res.role === 'BANK_MANAGER' ? 'Chief Branch Manager' : res.role === 'KYC_OFFICER' ? 'Senior KYC Verification Officer' : 'Account & Card Operations Specialist'),
        department: res.department || 'Operations',
        permissions: res.permissions || [],
        lastLogin: new Date().toLocaleString('en-IN')
      };
      setManagerUser(mgr);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('finedge_manager_user', JSON.stringify(mgr));
      }
      return { success: true, managerUser: mgr };
    } finally {
      setLoading(false);
    }
  };

  const managerLogout = () => {
    authService.managerLogout();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('finedge_manager_user');
    }
    setManagerUser(null);
  };

  // Submit Application (Account, Card, Loan, or Investment)
  const submitApplication = async (applicationData) => {
    if (applicationData.category === 'investment' || applicationData.category === 'Investment') {
      const db = getDb();
      if (!Array.isArray(db.investmentApplications)) db.investmentApplications = [];
      const newId = `INV-APP-${Date.now().toString().slice(-6)}`;
      const applicantName = applicationData.applicant?.fullName || applicationData.fullName || user?.fullName || user?.name || 'Applicant';
      const applicantMobile = applicationData.applicant?.mobileNumber || applicationData.mobile || user?.mobileNumber || user?.phone || '';
      const applicantEmail = applicationData.applicant?.email || applicationData.email || user?.email || '';
      const applicantDob = applicationData.applicant?.dob || applicationData.dob || '';
      const applicantPan = applicationData.applicant?.panNumber || applicationData.panNumber || user?.pan || '';

      const newApp = {
        id: newId,
        applicationId: newId,
        customerId: user?.customerId || 'CUS-GUEST',
        customer: {
          fullName: applicantName,
          mobileNumber: applicantMobile,
          email: applicantEmail,
        },
        category: 'investment',
        kind: applicationData.kind || 'FD',
        productSlug: applicationData.productSlug || '',
        productName: applicationData.productName || 'FinEdge Investment',
        applicant: {
          fullName: applicantName,
          mobileNumber: applicantMobile,
          email: applicantEmail,
          dob: applicantDob,
          panNumber: applicantPan,
        },
        applicantName,
        fullName: applicantName,
        email: applicantEmail,
        mobileNumber: applicantMobile,
        fundingAccount: applicationData.fundingAccount || {},
        investmentDetails: applicationData.investmentDetails || {},
        nominee: applicationData.nominee,
        consents: applicationData.consents || {},
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        timeline: [
          {
            stage: 'SUBMITTED',
            at: new Date().toISOString(),
            note: 'Application received via digital onboarding portal.'
          }
        ],
        steps: [
          { key: 'SUBMITTED', label: 'Submitted', state: 'COMPLETE', date: new Date().toISOString() },
          { key: 'VERIFICATION', label: 'Verification', state: 'CURRENT' },
          { key: 'APPROVED', label: 'Approved', state: 'UPCOMING' },
          { key: 'BOOKED', label: 'Booked', state: 'UPCOMING' }
        ]
      };
      db.investmentApplications.unshift(newApp);
      saveDb(db);
      refreshCustomerData();
      return {
        success: true,
        data: newApp,
        applicationId: newId,
        id: newId,
        referenceNumber: newId,
        reference: newId
      };
    } else if (applicationData.category === 'loan' || applicationData.category === 'Loans' || applicationData.productType === 'loan' || applicationData.productType === 'Loan') {
      const db = getDb();
      if (!Array.isArray(db.loanApplications)) db.loanApplications = [];
      const newId = `LN-APP-${Date.now().toString().slice(-6)}`;
      const applicantName = applicationData.applicantName || applicationData.fullName || user?.fullName || user?.name || 'Applicant';
      const newApp = {
        id: newId,
        applicationId: newId,
        customerId: user?.customerId || 'CUS-GUEST',
        customer: {
          fullName: applicantName,
          mobileNumber: applicationData.mobileNumber || applicationData.mobile || user?.mobileNumber || user?.phone || '',
          email: applicationData.email || user?.email || '',
        },
        applicantName,
        fullName: applicantName,
        email: applicationData.email || user?.email || '',
        mobileNumber: applicationData.mobileNumber || applicationData.mobile || user?.mobileNumber || user?.phone || '',
        productSlug: applicationData.productSlug || applicationData.slug || '',
        productName: applicationData.productName || applicationData.title || '',
        amount: Number(applicationData.amount || applicationData.loanAmount || 0),
        tenureMonths: Number(applicationData.tenureMonths || applicationData.tenure || 0),
        emi: Number(applicationData.emi || 0),
        rate: Number(applicationData.rate || 0),
        monthlyIncome: applicationData.monthlyIncome ? Number(applicationData.monthlyIncome) : undefined,
        employmentType: applicationData.employmentType || '',
        employerName: applicationData.employerName || '',
        purpose: applicationData.purpose || '',
        accountId: applicationData.accountId || applicationData.linkedAccountId || (applicationData.noAccountYet ? 'PENDING_SANCTION' : 'ACC-OPERATIVE'),
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        timeline: [
          {
            stage: 'SUBMITTED',
            at: new Date().toISOString(),
            note: 'Application received via digital onboarding portal.'
          }
        ],
        steps: [
          { key: 'SUBMITTED', label: 'Application Submitted', state: 'COMPLETE', date: new Date().toISOString() },
          { key: 'DOCUMENT_VERIFICATION', label: 'Document Verification', state: 'CURRENT' },
          { key: 'UNDER_REVIEW', label: 'Under Review', state: 'UPCOMING' },
          { key: 'APPROVED', label: 'Sanction & Disbursal', state: 'UPCOMING' }
        ],
        loanDetails: applicationData.loanDetails || {},
        consents: applicationData.consents || {}
      };
      db.loanApplications.unshift(newApp);
      saveDb(db);
      refreshCustomerData();
      return {
        success: true,
        data: newApp,
        applicationId: newId,
        id: newId,
        referenceNumber: newId,
        reference: newId
      };
    } else if (applicationData.productType === 'Savings Account' || applicationData.productType === 'Current Account' || applicationData.category === 'Accounts' || applicationData.category === 'account' || applicationData.productType === 'Account' || applicationData.productType === 'account') {
      const res = await accountService.applyForAccount({
        productCode: applicationData.productCode || (applicationData.title?.includes('Current') || applicationData.productName?.includes('Current') ? 'CURRENT_BUSINESS' : 'SAVINGS_REGULAR'),
        productName: applicationData.productName || applicationData.title,
        applicantName: applicationData.applicantName || applicationData.fullName,
        initialFundingAmount: Number(applicationData.initialFundingAmount || 0),
        nominee: applicationData.nominee || {
          fullName: 'Nominee Name',
          relationship: 'SPOUSE',
          dateOfBirth: '1998-01-01',
          mobileNumber: user?.mobileNumber || user?.phone || '9876543210'
        }
      });
      refreshCustomerData();
      return res;
    } else {
      const res = await cardService.applyForCard({
        cardType: applicationData.cardType || 'METAL_CREDIT',
        cardName: applicationData.cardName || applicationData.productName || applicationData.title || 'FinEdge Aurum Metal Card',
        linkedAccountId: applicationData.linkedAccountId || accounts[0]?.accountId || 'ACC-1001'
      });
      refreshCustomerData();
      return res;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      managerUser,
      profile,
      accounts,
      cards,
      applications,
      loading,
      login,
      verifyMfa,
      register,
      verifyOtp,
      logout,
      managerLogin,
      managerLogout,
      submitApplication,
      refreshCustomerData,
      isAuthenticated: Boolean(user),
      isManagerAuthenticated: Boolean(managerUser || getManagerToken())
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      managerUser: null,
      isManagerAuthenticated: false,
      isAuthenticated: false,
      accounts: [],
      cards: [],
      applications: [],
      loading: false,
      login: async () => {},
      logout: () => {},
      managerLogin: async () => {},
      managerLogout: () => {},
      refreshCustomerData: async () => {}
    };
  }
  return context;
};

export const useDbTick = () => {};

