// Customer & KYC Service
import { apiRequest, getAccessToken, generateUUID } from './api.js';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8080';

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

  // List Uploaded KYC Documents
  async getKycDocuments() {
    return apiRequest('/api/v1/customers/me/kyc/documents');
  },

  // Delete KYC Document
  async deleteKycDocument(documentReferenceId) {
    return apiRequest(`/api/v1/customers/me/kyc/documents/${documentReferenceId}`, {
      method: 'DELETE'
    });
  },

  // Upload KYC Document metadata & obtain upload URL (Section 3.3)
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

  // Upload KYC Document binary content (direct multipart endpoint)
  async uploadDocumentMultipart({ file, documentType }) {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const response = await fetch(`${BASE_URL}/api/v1/customers/me/kyc/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Correlation-Id': generateUUID()
      },
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        code: errData?.code || 'UPLOAD_FAILED',
        detail: errData?.detail || errData?.message || 'Document upload failed'
      };
    }
    return response.json();
  },

  // Complete KYC Document Upload (Section 3.3)
  async completeDocumentUpload(documentReferenceId) {
    return apiRequest(`/api/v1/customers/me/kyc/documents/${documentReferenceId}/complete`, {
      method: 'POST'
    });
  }
};
