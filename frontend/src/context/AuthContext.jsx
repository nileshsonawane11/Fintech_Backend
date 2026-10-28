import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { customerService } from '../services/customerService';
import { accountService } from '../services/accountService';
import { cardService } from '../services/cardService';
import { getAccessToken, getManagerToken, getDb } from '../services/api';

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

      const combinedApps = [
        ...filteredAccApps.map(a => ({
          id: a.accountApplicationId,
          productType: 'Account',
          productName: a.productName,
          applicantName: a.customerName,
          status: a.status,
          date: a.submittedAt?.split('T')[0] || '2026-10-12',
          steps: [
            { name: 'Application Submitted', completed: true, date: a.submittedAt?.split('T')[0] || '2026-10-12' },
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
          date: c.submittedAt?.split('T')[0] || '2026-10-11',
          steps: [
            { name: 'Application Submitted', completed: true, date: c.submittedAt?.split('T')[0] || '2026-10-11' },
            { name: 'Eligibility Assessment', completed: true, date: 'Completed' },
            { name: 'Card Approval', completed: c.status === 'APPROVED', date: c.status === 'APPROVED' ? 'Approved' : 'Pending' },
            { name: 'Card Dispatch & Delivery', completed: c.status === 'APPROVED', date: c.status === 'APPROVED' ? 'Dispatched' : 'Pending' }
          ]
        }))
      ];
      setApplications(combinedApps);
    } catch (e) {
      console.error('Error refreshing customer data', e);
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
      const db = getDb();
      const matched = db.customers.find(c => 
        (c.email && c.email.toLowerCase() === identifier.toLowerCase()) || 
        c.mobileNumber === identifier || 
        c.customerId === res.customerId
      ) || db.customers[0];

      const initialUser = {
        name: matched.fullName || 'FinEdge Customer',
        email: matched.email || identifier,
        mobile: matched.mobileNumber || identifier,
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

  // Complete MFA
  const verifyMfa = async (mfaReferenceId, otp) => {
    setLoading(true);
    try {
      const res = await authService.verifyMfa({ mfaReferenceId, otp });
      const db = getDb();
      const matched = db.customers.find(c => c.customerId === res.customerId) || db.customers[0];

      const initialUser = {
        name: matched.fullName || 'FinEdge Customer',
        email: matched.email || 'customer@example.com',
        mobile: matched.mobileNumber || '9876543210',
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
        name: res.fullName || 'Devendra Singhania',
        email: res.email || identifier,
        role: res.role || 'BANK_MANAGER',
        lastLogin: new Date().toLocaleString('en-IN')
      };
      setManagerUser(mgr);
      return { success: true, managerUser: mgr };
    } finally {
      setLoading(false);
    }
  };

  const managerLogout = () => {
    authService.managerLogout();
    setManagerUser(null);
  };

  // Submit Application (Account or Card)
  const submitApplication = async (applicationData) => {
    if (applicationData.productType === 'Savings Account' || applicationData.productType === 'Current Account' || applicationData.category === 'Accounts') {
      const res = await accountService.applyForAccount({
        productCode: applicationData.productCode || (applicationData.title?.includes('Current') ? 'CURRENT_BUSINESS' : 'SAVINGS_REGULAR'),
        initialFundingAmount: applicationData.initialFundingAmount || 10000,
        nominee: applicationData.nominee || {
          fullName: 'Nominee Name',
          relationship: 'SPOUSE',
          dateOfBirth: '1998-01-01',
          mobileNumber: '9876543210'
        }
      });
      refreshCustomerData();
      return res;
    } else {
      const res = await cardService.applyForCard({
        cardType: applicationData.cardType || 'METAL_CREDIT',
        cardName: applicationData.title || applicationData.productName || 'FinEdge Ashva Metal Card',
        linkedAccountId: accounts[0]?.accountId || 'ACC-1001'
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

export const useAuth = () => useContext(AuthContext);
