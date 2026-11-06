// Authentication & Session Management Service
import { apiRequest, setTokens, clearTokens, setManagerToken, clearManagerToken } from './api.js';

export const authService = {
  // Register Customer (Section 2.1 of API Doc)
  async register({ mobileNumber, email, password, fullName, acceptedTermsVersion = 'v2026-10-01', marketingConsent = false }) {
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
  // Module 43: Password step creates a short-lived pending challenge, NEVER an issued session.
  async login({ identifier, password }) {
    const res = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    return res;
  },

  // Verify MFA (Section 2.4 of API Doc)
  // Module 43: MFA verify is the ONLY path that issues a customer session.
  async verifyMfa({ mfaReferenceId, otp }) {
    const res = await apiRequest('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaReferenceId, otp })
    });
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
    }
  },

  // Bank Manager / Staff Login
  // Module 43: Remove forgeable catch-fallback; staff authenticates via API fallback against individual password.
  async managerLogin({ identifier, password }) {
    const res = await apiRequest('/admin/api/v1/auth/login', {
      method: 'POST',
      isManager: true,
      body: JSON.stringify({ identifier, password })
    });

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
