// Card Applications & Card Controls Service
import { apiRequest } from './api.js';

export const cardService = {
  // Get Public Card Catalog
  async getPublicCardProducts() {
    return apiRequest('/public/api/v1/card-products');
  },

  // Get Customer Cards (Section 7.2)
  async getCards() {
    return apiRequest('/api/v1/cards', {
      method: 'GET'
    });
  },

  // Get Customer Card Applications
  async getCardApplications() {
    return apiRequest('/api/v1/cards/applications', {
      method: 'GET'
    });
  },

  // Apply for Card (Section 7.1)
  async applyForCard({ cardType, cardName, productSlug, linkedAccountId, requestedLimit, deliveryAddressId = 'ADDR-1001', ...rest }) {
    return apiRequest('/api/v1/cards/applications', {
      method: 'POST',
      body: JSON.stringify({
        cardType,
        cardName,
        productSlug,
        linkedAccountId,
        requestedLimit,
        deliveryAddressId,
        ...rest
      })
    });
  },

  // Block Card (Temporary or Permanent)
  async blockCard(cardId, { blockType = 'TEMPORARY', reason, remarks } = {}) {
    return apiRequest(`/api/v1/cards/${cardId}/block`, {
      method: 'POST',
      body: JSON.stringify({ blockType, reason, remarks })
    });
  },

  // Unblock Card (Temporary block unfreeze)
  async unblockCard(cardId) {
    return apiRequest(`/api/v1/cards/${cardId}/unblock`, {
      method: 'POST'
    });
  },

  // Update Card Controls & Spending Limits (Section 12.3 PUT /api/v1/cards/{id}/controls)
  async updateControls(cardId, controls) {
    return apiRequest(`/api/v1/cards/${cardId}/controls`, {
      method: 'PUT',
      body: JSON.stringify(controls)
    });
  }
};
