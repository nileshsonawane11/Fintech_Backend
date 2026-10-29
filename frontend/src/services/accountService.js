// Account & Transaction Service
import { apiRequest } from './api';

export const accountService = {
  // List Customer Accounts (Section 4.3)
  async getAccounts() {
    return apiRequest('/api/v1/accounts');
  },

  // Apply for New Account (Section 4.2)
  async applyForAccount({ productCode, initialFundingAmount, nominee }) {
    return apiRequest('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        productCode,
        initialFundingAmount: Number(initialFundingAmount),
        nominee
      })
    });
  },

  // Get Account Details (Section 4.3)
  async getAccountDetails(accountId) {
    return apiRequest(`/api/v1/accounts/${accountId}`);
  },

  // Get Account Balance (Section 5.1)
  async getAccountBalance(accountId) {
    return apiRequest(`/api/v1/accounts/${accountId}/balance`);
  },

  // List Transactions (Section 5.2)
  async getTransactions(accountId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/accounts/${accountId}/transactions${query ? '?' + query : ''}`;
    return apiRequest(endpoint);
  },

  // Initiate Transfer (Section 6.2)
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
  }
};
