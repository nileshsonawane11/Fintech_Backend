// Authentication & Session Management Service (Module 50)
import { apiRequest, setTokens, clearTokens, setManagerToken, clearManagerToken } from './api.js';
import { traceRequest } from '../lib/trace.js';

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

export const authService = {
  // Register Customer (Section 2.1 of API Doc)
  async register({ mobileNumber, email, password, fullName, acceptedTermsVersion = 'v2026-10-01', marketingConsent = false }) {
    traceRequest('POST', '/api/v1/auth/register', { fullName, mobileNumber, email, password });
    return apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName,
        mobileNumber,
        email,
        password,
        acceptedTermsVersion,
        marketingConsent
      })
    });
  },

  // Verify OTP (Section 2.2 of API Doc)
  async verifyOtp({ referenceId, otp, purpose = 'REGISTRATION' }) {
    traceRequest('POST', '/api/v1/auth/otp/verify', { referenceId, otp, purpose });
    return apiRequest('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        referenceId,
        otp,
        purpose
      })
    });
  },

  // Customer Login (Section 2.3 of API Doc)
  // A2 & A3: The customer login authenticates customer records only.
  // Account type is decided by matched record's own type/role - never by caller flag.
  async login({ identifier, password }) {
    traceRequest('POST', '/api/v1/auth/login', { identifier, password });
    const res = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });

    // Check matched record's intrinsic role / type from server response / store
    const recordRole = res?.customer?.role || res?.user?.role || res?.role;
    const recordType = res?.type || res?.customer?.type || res?.user?.type;

    if ((recordRole && recordRole !== 'CUSTOMER') || (recordType && recordType !== 'CUSTOMER')) {
      // Credential pair is valid for staff portal, refused on customer portal with generic error
      clearTokens();
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Authentication Failed',
        detail: 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.'
      };
    }

    return res;
  },

  // Verify MFA (Section 2.4 of API Doc)
  async verifyMfa({ mfaReferenceId, otp }) {
    traceRequest('POST', '/api/v1/auth/mfa/verify', { mfaReferenceId, otp });
    const res = await apiRequest('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaReferenceId, otp })
    });

    const recordRole = res?.customer?.role || res?.user?.role || res?.role;
    const recordType = res?.type || res?.customer?.type;
    if ((recordRole && recordRole !== 'CUSTOMER') || (recordType && recordType !== 'CUSTOMER')) {
      clearTokens();
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Authentication Failed',
        detail: 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.'
      };
    }

    if (res.accessToken) {
      setTokens(res.accessToken, res.refreshToken);
    }
    return res;
  },

  // Customer Logout
  logout() {
    clearTokens();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('finedge_demo_user');
      localStorage.removeItem('finedge_session_customer_id');
    }
  },

  // Bank Manager / Staff Login
  // A2 & A3: The staff login authenticates staff records only.
  // Refuses customer records with generic invalid credentials error.
  async managerLogin({ identifier, password }) {
    traceRequest('POST', '/admin/api/v1/auth/login', { identifier, password });
    let res;
    try {
      res = await apiRequest('/admin/api/v1/auth/login', {
        method: 'POST',
        isManager: true,
        body: JSON.stringify({ identifier, password })
      });
    } catch (err) {
      // If server does not have /admin prefix, fallback to /api/v1/auth/login
      if (err.status === 404 || err.code === 'NOT_FOUND') {
        res = await apiRequest('/api/v1/auth/login', {
          method: 'POST',
          isManager: true,
          body: JSON.stringify({ identifier, password })
        });
      } else {
        throw err;
      }
    }

    // Inspect matched record's intrinsic role from server response / store
    const recordRole = res?.role || res?.customer?.role || res?.user?.role || res?.staff?.role;
    const recordType = res?.type || res?.customer?.type || res?.staff?.type;

    const isStaff = (recordRole && STAFF_ROLES.includes(recordRole)) || recordType === 'STAFF';

    if (!isStaff || recordRole === 'CUSTOMER' || recordType === 'CUSTOMER') {
      // Customer credentials refused on staff login with generic error; no session created
      clearManagerToken();
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('finedge_manager_user');
      }
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Authentication Failed',
        detail: 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.'
      };
    }

    if (res.accessToken) {
      setManagerToken(res.accessToken);
    }
    return res;
  },

  managerLogout() {
    clearManagerToken();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('finedge_manager_user');
    }
  }
};
