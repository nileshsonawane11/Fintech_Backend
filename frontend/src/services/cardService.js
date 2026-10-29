// Card Applications & Card Controls Service
import { apiRequest } from './api';

export const cardService = {
  // Get Customer Cards (Section 7.2)
  async getCards() {
    return apiRequest('/api/v1/cards');
  },

  // Apply for Card (Section 7.1)
  async applyForCard({ cardType, cardName, linkedAccountId, deliveryAddressId = 'ADDR-1001' }) {
    return apiRequest('/api/v1/cards/applications', {
      method: 'POST',
      body: JSON.stringify({
        cardType,
        cardName,
        linkedAccountId,
        deliveryAddressId
      })
    });
  },

  // Permanently Block Card (Section 7.3)
  async blockCard(cardId, { reason, remarks }) {
    return apiRequest(`/api/v1/cards/${cardId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason, remarks })
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
