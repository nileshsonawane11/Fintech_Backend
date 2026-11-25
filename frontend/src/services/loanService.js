// Loan Service (Backend Microservice via API Gateway)
import { apiRequest } from './api.js';

export const loanService = {
  async getLoanProducts(loanType) {
    const query = loanType ? `?loanType=${encodeURIComponent(loanType)}` : '';
    return apiRequest(`/api/v1/loans/products${query}`);
  },

  async applyForLoan({
    productCode = 'PL_SALARIED_001',
    requestedAmount,
    tenureMonths = 36,
    purpose = 'Personal Financial Requirement',
    employmentType = 'SALARIED',
    monthlyIncome = 50000,
    employerName = 'Enterprise',
    incomeDetails,
    creditBureauConsent = true
  }) {
    const normalizedPurpose = String(purpose || 'Personal Financial Requirement').slice(0, 100);
    const empType = String(employmentType || 'SALARIED')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    return apiRequest('/api/v1/loans/applications', {
      method: 'POST',
      body: JSON.stringify({
        productCode,
        requestedAmount: Number(requestedAmount),
        tenureMonths: Number(tenureMonths) || 36,
        purpose: normalizedPurpose,
        creditBureauConsent: Boolean(creditBureauConsent),
        incomeDetails: incomeDetails || {
          employmentType: empType,
          monthlyIncome: Number(monthlyIncome) || 50000,
          employerName: employerName || 'Self / Enterprise'
        }
      })
    });
  },

  async acceptOffer(offerId, { acceptedTermsVersion = 'v2026-10-01', disbursementAccountId }) {
    return apiRequest(`/api/v1/loans/offers/${offerId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ acceptedTermsVersion, disbursementAccountId })
    });
  },

  async getRepaymentSchedule(loanAccountId) {
    return apiRequest(`/api/v1/loans/${loanAccountId}/schedule`);
  }
};

export default loanService;
