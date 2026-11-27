const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay Checkout requires a browser environment'));
  }
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () => {
        scriptPromise = null;
        reject(new Error('Failed to load Razorpay Checkout SDK'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        scriptPromise = null;
        reject(new Error('Razorpay SDK loaded but window.Razorpay is unavailable'));
      }
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Razorpay Checkout SDK'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function openRazorpayCheckoutModal({
  keyId,
  orderId,
  amountPaise,
  currency = 'INR',
  name = 'FinBank',
  description = 'FinBank Payment',
  prefill = {},
  notes = {},
}) {
  const Razorpay = await loadRazorpayCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      amount: amountPaise,
      currency,
      name,
      description,
      order_id: orderId,
      prefill,
      notes,
      theme: { color: '#0f172a' },
      handler: (response) => {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          const err = new Error('Payment checkout was cancelled by the user');
          err.code = 'CHECKOUT_CANCELLED';
          reject(err);
        },
      },
    });

    rzp.on('payment.failed', (failure) => {
      const msg = failure?.error?.description || 'Payment failed in Razorpay Checkout';
      const err = new Error(msg);
      err.code = failure?.error?.code || 'RAZORPAY_PAYMENT_FAILED';
      reject(err);
    });

    rzp.open();
  });
}
