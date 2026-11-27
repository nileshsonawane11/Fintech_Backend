import { apiRequest } from './api';
import { openRazorpayCheckoutModal } from '../utils/razorpayCheckout';

export async function createPaymentOrder({
  purpose,
  destinationAccountId = null,
  businessReference = null,
  amount,
  currency = 'INR',
  notes = {},
}) {
  return apiRequest('/api/v1/payments/orders', {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      destinationAccountId,
      businessReference,
      amount,
      currency,
      notes,
    }),
  });
}

export async function verifyRazorpayPayment({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  return apiRequest('/api/v1/payments/verify', {
    method: 'POST',
    body: JSON.stringify({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    }),
  });
}

export async function listPayments(page = 0, size = 20) {
  return apiRequest(`/api/v1/payments?page=${page}&size=${size}`, {
    method: 'GET',
  });
}

export async function getPaymentStatus(paymentId) {
  return apiRequest(`/api/v1/payments/${encodeURIComponent(paymentId)}/status`, {
    method: 'GET',
  });
}

export async function executeRazorpayCheckoutFlow({
  purpose,
  destinationAccountId = null,
  businessReference = null,
  amount,
  currency = 'INR',
  description = 'FinBank Payment',
  prefill = {},
  notes = {},
}) {
  const order = await createPaymentOrder({
    purpose,
    destinationAccountId,
    businessReference,
    amount,
    currency,
    notes,
  });

  const checkoutResult = await openRazorpayCheckoutModal({
    keyId: order.keyId,
    orderId: order.razorpayOrderId,
    amountPaise: order.amountPaise,
    currency: order.currency || currency,
    description,
    prefill,
    notes,
  });

  return verifyRazorpayPayment(checkoutResult);
}
