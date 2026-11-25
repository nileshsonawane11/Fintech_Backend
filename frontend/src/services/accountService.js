// Account & Transaction Service
import { apiRequest } from './api.js';

const KNOWN_PRODUCT_CODES = new Set(['SAVINGS_REGULAR', 'SAVINGS_PREMIUM', 'CURRENT_STANDARD']);

export function mapAccountProductCode(productCodeOrSlug, productNameOrTitle) {
  if (productCodeOrSlug && KNOWN_PRODUCT_CODES.has(productCodeOrSlug)) {
    return productCodeOrSlug;
  }
  const text = `${productCodeOrSlug || ''} ${productNameOrTitle || ''}`.toLowerCase();
  if (text.includes('current') || text.includes('business') || text.includes('trade')) {
    return 'CURRENT_STANDARD';
  }
  if (text.includes('premium') || text.includes('salary') || text.includes('wealth') || text.includes('privilege')) {
    return 'SAVINGS_PREMIUM';
  }
  return 'SAVINGS_REGULAR';
}

export function normalizeNominee(nominee) {
  if (!nominee || !nominee.fullName) return undefined;
  const relRaw = String(nominee.relationship || 'OTHER').trim().toUpperCase();
  let relationship = 'OTHER';
  if (relRaw === 'SPOUSE' || relRaw === 'WIFE' || relRaw === 'HUSBAND') relationship = 'SPOUSE';
  else if (relRaw === 'CHILD' || relRaw === 'SON' || relRaw === 'DAUGHTER') relationship = 'CHILD';
  else if (relRaw === 'PARENT' || relRaw === 'FATHER' || relRaw === 'MOTHER') relationship = 'PARENT';
  else if (relRaw === 'SIBLING' || relRaw === 'BROTHER' || relRaw === 'SISTER') relationship = 'SIBLING';

  const dob = nominee.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(String(nominee.dateOfBirth))
    ? nominee.dateOfBirth
    : '1995-01-01';
  const mob = nominee.mobileNumber && /^[0-9]{10}$/.test(String(nominee.mobileNumber))
    ? String(nominee.mobileNumber)
    : undefined;

  return {
    fullName: String(nominee.fullName).trim().slice(0, 150),
    relationship,
    dateOfBirth: dob,
    ...(mob ? { mobileNumber: mob } : {}),
    allocationPercentage: nominee.allocationPercentage ? Number(nominee.allocationPercentage) : 100
  };
}

export const accountService = {
  // List Customer Accounts (Section 4.3)
  async getAccounts() {
    return apiRequest('/api/v1/accounts');
  },

  // Apply for New Account (Section 4.2)
  async applyForAccount({ productCode, productName, title, initialFundingAmount, nominee }) {
    const resolvedCode = mapAccountProductCode(productCode, productName || title);
    return apiRequest('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        productCode: resolvedCode,
        initialFundingAmount: Math.max(0, Number(initialFundingAmount) || 0),
        nominee: normalizeNominee(nominee)
      })
    });
  },

  // Apply for New Account (Unregistered Public Applicant)
  async applyUnregistered(data) {
    const resolvedCode = mapAccountProductCode(data.productCode || data.productSlug, data.productName || data.title);
    const addr = data.address || {};
    const cust = data.customer || data.applicant || {};
    const mobile = String(data.mobileNumber || data.mobile || cust.mobile || '').replace(/\D/g, '').slice(-10);
    const dob = data.dateOfBirth || data.dob || cust.dob || '1995-01-01';
    const genderRaw = String(data.gender || cust.gender || 'OTHER').toUpperCase();
    const gender = ['MALE', 'FEMALE', 'OTHER'].includes(genderRaw) ? genderRaw : 'OTHER';

    return apiRequest('/api/v1/accounts/apply-unregistered', {
      method: 'POST',
      body: JSON.stringify({
        productCode: resolvedCode,
        initialFundingAmount: Math.max(0, Number(data.initialFundingAmount ?? data.initialFunding ?? 5000)),
        fullName: (data.fullName || data.applicantName || cust.fullName || '').trim(),
        dateOfBirth: dob,
        gender,
        mobileNumber: mobile,
        email: (data.email || cust.email || '').trim(),
        addressLine1: (data.addressLine1 || addr.line1 || addr.addressLine1 || '').trim(),
        addressLine2: (data.addressLine2 || addr.line2 || addr.addressLine2 || '').trim() || undefined,
        city: (data.city || addr.city || '').trim(),
        state: (data.state || addr.state || '').trim(),
        postalCode: String(data.postalCode || addr.pin || addr.postalCode || '').trim(),
        pan: String(data.pan || data.panNumber || cust.pan || '').trim().toUpperCase(),
        aadhaarNumber: String(data.aadhaarNumber || cust.aadhaarNumber || '123456789012').trim(),
        nominee: normalizeNominee(data.nominee)
      })
    });
  },

  // List Customer Account Applications
  async getApplications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/v1/accounts/applications${query ? '?' + query : ''}`);
  },

  // Get Application Details
  async getApplicationDetails(applicationId) {
    return apiRequest(`/api/v1/accounts/applications/${applicationId}`);
  },

  // Cancel Account Application
  async cancelApplication(applicationId) {
    return apiRequest(`/api/v1/accounts/applications/${applicationId}/cancel`, {
      method: 'POST'
    });
  },

  // List Public Account Catalog Products
  async getAccountProducts() {
    return apiRequest('/api/v1/account-products');
  },

  // Get Account Details (Section 4.3)
  async getAccountDetails(accountId) {
    return apiRequest(`/api/v1/accounts/${accountId}`);
  },

  // Get Account Balance (Section 5.1)
  async getAccountBalance(accountId) {
    return apiRequest(`/api/v1/accounts/${accountId}/balance`);
  },

  // Get Total Balance across all Customer Accounts
  async getTotalBalance() {
    return apiRequest('/api/v1/ledger/total-balance');
  },

  // List Transactions (Section 5.2)
  async getTransactions(accountId, params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = `/api/v1/accounts/${accountId}/transactions${query ? '?' + query : ''}`;
    return apiRequest(endpoint);
  },

  // Initiate External Bank Transfer (NEFT / IMPS / RTGS)
  async initiateTransfer({ debitAccountId, beneficiaryId, amount, remarks, transferMode = 'IMPS' }) {
    return apiRequest('/api/v1/payments/transfers', {
      method: 'POST',
      body: JSON.stringify({
        debitAccountId,
        beneficiaryId,
        amount: Number(amount),
        currency: 'INR',
        remarks,
        transferMode
      })
    });
  },

  // Initiate Internal Account-to-Account Transfer (Ledger Service)
  async initiateInternalTransfer({ sourceAccountId, destinationAccountId, amount, remarks, reference }) {
    return apiRequest('/api/v1/transfers', {
      method: 'POST',
      body: JSON.stringify({
        sourceAccountId,
        destinationAccountId,
        amount: Number(amount),
        currency: 'INR',
        remarks: remarks || 'Internal Account Transfer',
        reference
      })
    });
  },

  // Initiate UPI Payout (Payment Service)
  async initiateUpiTransfer({ debitAccountId, beneficiaryId, amount, remarks }) {
    return apiRequest('/api/v1/payments/transfers/upi', {
      method: 'POST',
      body: JSON.stringify({
        debitAccountId,
        beneficiaryId,
        amount: Number(amount),
        currency: 'INR',
        remarks: remarks || 'UPI Transfer'
      })
    });
  }
};
