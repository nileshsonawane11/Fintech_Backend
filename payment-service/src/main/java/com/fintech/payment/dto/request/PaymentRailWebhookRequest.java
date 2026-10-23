package com.fintech.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public class PaymentRailWebhookRequest {
    @NotBlank(message = "Rail reference is required")
    @Size(max = 50, message = "Rail reference is too long")
    private String railReference;

    @NotBlank(message = "Payment reference is required")
    @Size(max = 50, message = "Payment reference is too long")
    private String paymentReference;

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(SUCCESS|FAILED)$", message = "Status must be SUCCESS or FAILED")
    private String status;

    @Size(max = 100, message = "Status reason is too long")
    private String statusReason;

    private Instant completedAt;

    public String getRailReference() { return railReference; }
    public void setRailReference(String railReference) { this.railReference = railReference; }
    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
