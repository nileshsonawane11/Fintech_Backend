package com.fintech.loan.dto.request;

import com.fintech.loan.enums.ProcessingFeeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Map;

public record LoanProductFeeRequest(
        @NotNull(message = "Processing fee type is required")
        ProcessingFeeType processingFeeType,

        @NotNull(message = "Processing fee value is required")
        @DecimalMin(value = "0.00", message = "Processing fee value cannot be negative")
        BigDecimal processingFeeValue,

        @DecimalMin(value = "0.00", message = "Minimum processing fee cannot be negative")
        BigDecimal minimumProcessingFee,

        @DecimalMin(value = "0.00", message = "Maximum processing fee cannot be negative")
        BigDecimal maximumProcessingFee,

        @DecimalMin(value = "0.00", message = "Prepayment charge percentage cannot be negative")
        BigDecimal prepaymentChargePercentage,

        @Size(max = 255)
        String prepaymentCharges,

        @DecimalMin(value = "0.00", message = "Foreclosure charge percentage cannot be negative")
        BigDecimal foreclosureChargePercentage,

        @Size(max = 255)
        String foreclosureCharges,

        @DecimalMin(value = "0.00", message = "Late payment penalty cannot be negative")
        BigDecimal latePaymentPenalty,

        @Size(max = 255)
        String latePaymentPenaltyDescription,

        @DecimalMin(value = "0.00", message = "Cheque bounce charges cannot be negative")
        BigDecimal chequeBounceCharges,

        Map<String, Object> additionalCharges
) {
}
