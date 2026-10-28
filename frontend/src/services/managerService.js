// Bank Manager & Staff Operations Service
import { apiRequest, getDb, saveDb, appendAuditLog } from './api';

export const managerService = {
  // Operational Dashboard Metrics
  async getMetrics() {
    return apiRequest('/admin/api/v1/metrics', { isManager: true });
  },

  // Customer List
  async getCustomers() {
    return apiRequest('/admin/api/v1/customers', { isManager: true }).catch(() => {
      return getDb().customers;
    });
  },

  // KYC Queue & Approvals (Section 3.4)
  async getKycApplications() {
    return apiRequest('/ops/api/v1/kyc/applications', { isManager: true });
  },

  async approveKyc(kycCaseId, { remarks = 'All documents verified', riskCategory = 'LOW' } = {}) {
    return apiRequest(`/ops/api/v1/kyc/${kycCaseId}/approve`, {
      method: 'POST',
      isManager: true,
      body: JSON.stringify({ remarks, riskCategory })
    });
  },

  async rejectKyc(kycCaseId, { remarks = 'Documents blurry or invalid' } = {}) {
    return apiRequest(`/ops/api/v1/kyc/${kycCaseId}/reject`, {
      method: 'POST',
      isManager: true,
      body: JSON.stringify({ remarks, riskCategory: 'HIGH' })
    });
  },

  // Account Applications Review
  async getAccountApplications() {
    return apiRequest('/ops/api/v1/accounts/applications', { isManager: true });
  },

  async approveAccountApplication(accountApplicationId) {
    return apiRequest(`/ops/api/v1/accounts/applications/${accountApplicationId}/approve`, {
      method: 'POST',
      isManager: true
    });
  },

  // Card Applications Review
  async getCardApplications() {
    return apiRequest('/ops/api/v1/cards/applications', { isManager: true });
  },

  async approveCardApplication(cardApplicationId) {
    return apiRequest(`/ops/api/v1/cards/applications/${cardApplicationId}/approve`, {
      method: 'POST',
      isManager: true
    });
  },

  // Staff User Management
  async getStaffUsers() {
    return apiRequest('/admin/api/v1/staff', { isManager: true });
  },

  async createStaffUser(staffData) {
    return apiRequest('/admin/api/v1/staff', {
      method: 'POST',
      isManager: true,
      body: JSON.stringify(staffData)
    });
  },

  async updateStaffPermissions(staffId, permissions) {
    return apiRequest(`/admin/api/v1/staff/${staffId}/permissions`, {
      method: 'PUT',
      isManager: true,
      body: JSON.stringify({ permissions })
    }).catch(() => {
      const db = getDb();
      const staff = db.staffUsers.find(s => s.staffId === staffId);
      if (staff) {
        staff.permissions = permissions;
        saveDb(db);
        appendAuditLog('manager@finedge.bank', 'BANK_MANAGER', 'STAFF_PERMISSIONS_UPDATED', staffId, 'SUCCESS', `Updated permissions to ${permissions.length} items`);
      }
      return staff;
    });
  },

  // Audit Logs
  async getAuditLogs() {
    return apiRequest('/admin/api/v1/audit-logs', { isManager: true });
  }
};
