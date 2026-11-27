// Investment Service (Backend Microservice via API Gateway)
import { apiRequest } from './api.js';

export const investmentService = {
  // Public Catalog & Authoritative Calculators
  async getProducts(type) {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return apiRequest(`/api/v1/investments/products${query}`);
  },

  async getProduct(productCode) {
    return apiRequest(`/api/v1/investments/products/${encodeURIComponent(productCode)}`);
  },

  async previewFd(payload) {
    return apiRequest('/api/v1/investments/calculators/fd', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async previewRd(payload) {
    return apiRequest('/api/v1/investments/calculators/rd', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async previewSip(payload) {
    return apiRequest('/api/v1/investments/calculators/sip', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async previewSsy(payload) {
    return apiRequest('/api/v1/investments/calculators/ssy', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Customer Applications & Holdings
  async submitApplication(payload) {
    return apiRequest('/api/v1/investments/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listMyApplications() {
    return apiRequest('/api/v1/investments/applications');
  },

  async attachDocument(applicationId, payload) {
    return apiRequest(`/api/v1/investments/applications/${encodeURIComponent(applicationId)}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listMyInvestments() {
    return apiRequest('/api/v1/investments');
  },

  async getInvestment(investmentId) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}`);
  },

  async getCertificate(investmentId) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/certificate`);
  },

  async getSchedules(investmentId) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/schedules`);
  },

  async getTransactions(investmentId) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/transactions`);
  },

  async updateAutoRenewal(investmentId, payload) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/auto-renewal`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async pauseSip(investmentId) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/sip/pause`, { method: 'POST' });
  },

  async resumeSip(investmentId) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/sip/resume`, { method: 'POST' });
  },

  async modifySip(investmentId, payload) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/sip`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async cancelSip(investmentId) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/sip/cancel`, { method: 'POST' });
  },

  async depositSsy(investmentId, payload) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/ssy/deposits`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async requestWithdrawal(investmentId, payload) {
    return apiRequest(`/api/v1/investments/${encodeURIComponent(investmentId)}/withdrawals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Staff Operations
  async getOpsDashboard() {
    return apiRequest('/api/v1/investments/ops/dashboard', { isManager: true });
  },

  async approveApplication(applicationId, payload = {}) {
    return apiRequest(`/api/v1/investments/ops/applications/${encodeURIComponent(applicationId)}/approve`, {
      method: 'POST',
      isManager: true,
      body: JSON.stringify(payload),
    });
  },

  async rejectApplication(applicationId, payload = {}) {
    return apiRequest(`/api/v1/investments/ops/applications/${encodeURIComponent(applicationId)}/reject`, {
      method: 'POST',
      isManager: true,
      body: JSON.stringify(payload),
    });
  },

  async verifyDocument(documentId, approved, remarks = '') {
    const q = `?approved=${Boolean(approved)}&remarks=${encodeURIComponent(remarks)}`;
    return apiRequest(`/api/v1/investments/ops/documents/${encodeURIComponent(documentId)}/verify${q}`, {
      method: 'POST',
      isManager: true,
    });
  },

  // Admin Product Management
  async adminListProducts() {
    return apiRequest('/api/v1/investments/admin/products', { isManager: true });
  },

  async adminCreateProduct(payload) {
    return apiRequest('/api/v1/investments/admin/products', {
      method: 'POST',
      isManager: true,
      body: JSON.stringify(payload),
    });
  },

  async adminUpdateProduct(productCode, payload) {
    return apiRequest(`/api/v1/investments/admin/products/${encodeURIComponent(productCode)}`, {
      method: 'PUT',
      isManager: true,
      body: JSON.stringify(payload),
    });
  },

  async adminUpdateProductStatus(productCode, status, remarks = '') {
    return apiRequest(`/api/v1/investments/admin/products/${encodeURIComponent(productCode)}/status`, {
      method: 'PATCH',
      isManager: true,
      body: JSON.stringify({ status, remarks }),
    });
  },

  async adminGetStatistics() {
    return apiRequest('/api/v1/investments/admin/products/statistics', { isManager: true });
  },
};

export default investmentService;
