// Customer & KYC Service
import { apiRequest, getAccessToken, generateUUID } from './api.js';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8080';

const ALLOWED_DOCUMENT_TYPES = new Set([
  'PAN',
  'ADDRESS_PROOF',
  'IDENTITY_PROOF',
  'PASSPORT',
  'DRIVING_LICENCE',
  'VOTER_ID'
]);

export function mapDocumentType(rawType) {
  const upper = String(rawType || 'IDENTITY_PROOF').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (ALLOWED_DOCUMENT_TYPES.has(upper)) return upper;
  if (upper === 'AADHAAR' || upper === 'AADHAR' || upper === 'PHOTO') return 'IDENTITY_PROOF';
  if (upper.includes('ADDRESS') || upper.includes('UTILITY')) return 'ADDRESS_PROOF';
  if (upper.includes('PAN')) return 'PAN';
  return 'IDENTITY_PROOF';
}

export const customerService = {
  mapDocumentType,

  // Get Current Customer Profile (Section 3.1)
  async getProfile() {
    return apiRequest('/api/v1/customers/me');
  },

  // Provision / Update Applicant Profile
  async provisionApplicant(applicantData) {
    return apiRequest('/api/v1/customers/applicant', {
      method: 'POST',
      body: JSON.stringify(applicantData)
    });
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
        documentType: mapDocumentType(documentType),
        fileName,
        contentType,
        contentSizeBytes
      })
    });
  },

  // Upload KYC Document binary content (direct multipart endpoint)
  async uploadDocumentMultipart({ file, documentType, documentName }) {
    const token = getAccessToken();
    const mappedType = mapDocumentType(documentType);
    const resolvedName = documentName || file?.name || `${mappedType.toLowerCase()}.pdf`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', mappedType);
    formData.append('documentName', resolvedName);

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
      const firstErr = Array.isArray(errData?.errors) && errData.errors[0]?.message;
      throw {
        status: response.status,
        code: errData?.code || 'UPLOAD_FAILED',
        detail: firstErr || errData?.detail || errData?.message || 'Document upload failed'
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
