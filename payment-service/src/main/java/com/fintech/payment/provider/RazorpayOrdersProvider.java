package com.fintech.payment.provider;

import com.fintech.payment.provider.model.ProviderModels.*;

import java.util.List;

public interface RazorpayOrdersProvider {

    RazorpayOrderResult createOrder(CreateOrderCommand command);

    RazorpayOrderResult fetchOrder(String razorpayOrderId);

    List<RazorpayPaymentResult> fetchOrderPayments(String razorpayOrderId);

    RazorpayPaymentResult fetchPayment(String razorpayPaymentId);

    RazorpayPaymentResult capturePayment(CapturePaymentCommand command);

    RazorpayRefundResult refundPayment(RefundPaymentCommand command);

    RazorpayRefundResult fetchRefund(String razorpayPaymentId, String razorpayRefundId);
}
