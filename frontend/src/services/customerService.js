// Customer & KYC Service
import { apiRequest } from './api';

export const customerService = {
  // Get Current Customer Profile (Section 3.1)
  async getProfile() {
    return apiRequest('/api/v1/customers/me');
  },

  // Submit KYC Application (Section 3.2)
  async submitKyc(kycData) {
    return apiRequest('/api/v1/customers/me/kyc', {
      method: 'POST',
      body: JSON.stringify(kycData)
    });
  },

  // Get KYC Status (Section 3.2)
  async getKycStatus() {
    return apiRequest('/api/v1/customers/me/kyc');
  },

  // Upload KYC Document metadata & obtain pre-signed URL (Section 3.3)
  async requestDocumentUpload({ documentType, fileName, contentType, contentSizeBytes }) {
    return apiRequest('/api/v1/customers/me/kyc/documents', {
      method: 'POST',
      body: JSON.stringify({
        documentType,
        fileName,
        contentType,
        contentSizeBytes
      })
    });
  },

  // Complete KYC Document Upload (Section 3.3)
  async completeDocumentUpload(documentReferenceId) {
    return apiRequest(`/api/v1/customers/me/kyc/documents/${documentReferenceId}/complete`, {
      method: 'POST'
    });
  }
};
