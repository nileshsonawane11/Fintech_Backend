// Notification & Support Service (Backend Microservice via API Gateway)
import { apiRequest } from './api.js';

export const notificationService = {
  async getNotifications({ unreadOnly = false, limit = 20 } = {}) {
    const query = new URLSearchParams({
      unreadOnly: String(Boolean(unreadOnly)),
      limit: String(Math.max(1, Math.min(Number(limit) || 20, 100)))
    }).toString();
    return apiRequest(`/api/v1/notifications?${query}`);
  },

  async createSupportTicket({
    category = 'GENERAL',
    subject,
    description,
    relatedPaymentId = null
  }) {
    const allowedCategories = ['PAYMENT_ISSUE', 'ACCOUNT_ISSUE', 'CARD_ISSUE', 'LOAN_ISSUE', 'GENERAL'];
    const upperCat = String(category || 'GENERAL').toUpperCase();
    const mappedCategory = allowedCategories.includes(upperCat) ? upperCat : 'GENERAL';

    return apiRequest('/api/v1/support/tickets', {
      method: 'POST',
      body: JSON.stringify({
        category: mappedCategory,
        subject: String(subject || 'Customer Support Inquiry').slice(0, 255),
        description: String(description || ''),
        relatedPaymentId: relatedPaymentId ? String(relatedPaymentId).slice(0, 50) : null
      })
    });
  }
};

export default notificationService;
