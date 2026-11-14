import { applyLoan, bookFd } from '../services/portalBridge';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { customerService } from '../services/customerService';
import { accountService } from '../services/accountService';
import { cardService } from '../services/cardService';
import {getAccessToken, getManagerToken, setTokens} from '../services/api';

const AuthContext = createContext();

const STAFF_ROLES = [
  'BANK_MANAGER',
  'KYC_OFFICER',
  'ACCOUNT_OPS',
  'AUDIT_COMPLIANCE',
  'CUSTOMER_SUPPORT',
  'ADMIN',
  'OPERATIONS',
  'MANAGER',
  'STAFF'
];

export const AuthProvider = ({ children }) => {
  // Customer Session
  const [user, setUser] = useState(() => {
    if (typeof localStorage === 'undefined') return null;
    const saved = localStorage.getItem('finedge_demo_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  // Manager / Staff Session
  const [managerUser, setManagerUser] = useState(() => {
    if (typeof localStorage === 'undefined') return null;
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
          name: profData.fullName || prev?.name || 'FinEdge Customer',
          email: profData.email || prev?.email,
          mobile: profData.mobileNumber || prev?.mobile,
          customerId: profData.customerId || prev?.customerId,
          kycStatus: profData.kycStatus || 'APPROVED'
        }));
      }

      const accList = accsData?.data || accsData || [];
      setAccounts(Array.isArray(accList) ? accList : []);
      const cardList = cardsData?.data || cardsData || [];
      setCards(Array.isArray(cardList) ? cardList : []);

      // Module 50: No local mock applications
      setApplications([]);
    } catch (e) {
      // Quiet fallback
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('finedge_demo_user', JSON.stringify(user));
        if (user.customerId) {
          localStorage.setItem('finedge_session_customer_id', user.customerId);
        }
      }
      refreshCustomerData();
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('finedge_demo_user');
        localStorage.removeItem('finedge_session_customer_id');
      }
      setAccounts([]);
      setCards([]);
      setProfile(null);
    }
  }, [user, refreshCustomerData]);

  useEffect(() => {
    if (managerUser) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('finedge_manager_user', JSON.stringify(managerUser));
      }
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('finedge_manager_user');
      }
    }
  }, [managerUser]);

  // Customer Login with Two-Factor / MFA support
  const login = async (identifier, password, role = 'CUSTOMER') => {
    if (!password) {
      throw new Error('Password is required.');
    }
    setLoading(true);
    try {
      const res = await authService.login({ identifier, password, role });


      if (res.mfaRequired) {
        return { mfaRequired: true, mfaReferenceId: res.mfaReferenceId };
      }

      const custObj = res.customer || res.user || {};
      const recordRole = custObj.role || res.role;
      if (recordRole && recordRole !== 'CUSTOMER') {
        throw {
          status: 401,
          code: 'INVALID_CREDENTIALS',
          title: 'Authentication Failed',
          detail: 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.'
        };
      }

      const initialUser = {
        name: custObj.fullName || custObj.name || 'FinEdge Customer',
        email: custObj.email || identifier,
        mobile: custObj.mobileNumber || custObj.mobile || identifier,
        customerId: custObj.id || custObj.customerId || res.customerId,
        kycStatus: custObj.status || custObj.kycStatus || 'APPROVED',
        lastLogin: new Date().toISOString()
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
      const custObj = res.customer || res.user || {};
      const recordRole = custObj.role || res.role;
      if (recordRole && recordRole !== 'CUSTOMER') {
        throw {
          status: 401,
          code: 'INVALID_CREDENTIALS',
          title: 'Authentication Failed',
          detail: 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.'
        };
      }

      const initialUser = {
        name: custObj.fullName || custObj.name || 'FinEdge Customer',
        email: custObj.email || 'customer@finedge.bank',
        mobile: custObj.mobileNumber || custObj.mobile || '',
        customerId: custObj.id || custObj.customerId || res.customerId,
        kycStatus: custObj.status || custObj.kycStatus || 'APPROVED',
        lastLogin: new Date().toISOString()
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
  const managerLogin = async (identifier, password, role) => {
    setLoading(true);
    try {
      const res = await authService.managerLogin({ identifier, password });
      const recordRole = res.role || res?.customer?.role || res.user?.role;
      const isStaff = (recordRole && STAFF_ROLES.includes(recordRole)) || res.type === 'STAFF';
      if (!isStaff || recordRole === 'CUSTOMER' || !res?.customer?.id) {
        throw {
          status: 401,
          code: 'INVALID_CREDENTIALS',
          title: 'Authentication Failed',
          detail: 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.'
        };
      }

      const mgr = {
        staffId: res.id,
        name: res.fullName || res.name || 'Staff Member',
        email: res.email || identifier,
        role: recordRole,
        roleTitle: res.roleTitle || 'Operations Specialist',
        department: res.department || 'Operations',
        permissions: res.permissions || [],
        lastLogin: new Date().toISOString()
      };
      setManagerUser(mgr);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('finedge_manager_user', JSON.stringify(mgr));
      }
      console.log(res);
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
  // Module 50 B3: Unconnected flows are bypassed with visible note.
  const submitApplication = async (applicationData) => {
    const category = (applicationData.category || applicationData.productType || '').toLowerCase();
    if (category === 'investment' || category === 'investments') {
      const res = await bookFd(user?.customerId || null, {
        ...applicationData,
        customerId: user?.customerId || null,
        accountId: applicationData.accountId || applicationData.sourceAccountId || accounts[0]?.accountId || 'ACC-1001'
      });
      refreshCustomerData();
      return res;
    } else if (category === 'loan' || category === 'loans') {
      const res = await applyLoan(user?.customerId || null, {
        ...applicationData,
        customerId: user?.customerId || null,
        disbursementAccountId: applicationData.disbursementAccountId || accounts[0]?.accountId || 'ACC-1001'
      });
      refreshCustomerData();
      return res;
    } else if (category === 'account' || category === 'accounts' || applicationData.productType?.toLowerCase().includes('account')) {
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
        },
        ...applicationData
      });
      refreshCustomerData();
      return res;
    } else {
      const res = await cardService.applyForCard({
        cardType: applicationData.cardType || 'CREDIT',
        cardName: applicationData.cardName || applicationData.productName || applicationData.title || 'FinEdge Edge Cashback Card',
        productSlug: applicationData.productSlug || 'edge-cashback-credit',
        linkedAccountId: applicationData.linkedAccountId || accounts[0]?.accountId || 'ACC-1001',
        requestedLimit: applicationData.requestedLimit,
        ...applicationData
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
