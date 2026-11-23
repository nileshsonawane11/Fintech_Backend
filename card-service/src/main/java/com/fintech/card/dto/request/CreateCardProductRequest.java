package com.fintech.card.dto.request;

import com.fintech.card.entity.config.CreditCardConfig;
import com.fintech.card.entity.config.DebitCardConfig;
import com.fintech.card.enums.CardType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Schema(description = "Request payload for creating a new credit or debit card product")
public record CreateCardProductRequest(
        @NotBlank(message = "Product code is required")
        @Pattern(regexp = "^[A-Z0-9_]{3,50}$", message = "Product code must be 3-50 uppercase alphanumeric characters or underscores")
        @Schema(description = "Unique product code", example = "EDGE_CASHBACK_CARD")
        String productCode,

        @NotBlank(message = "Product name is required")
        @Size(max = 100, message = "Product name must not exceed 100 characters")
        @Schema(description = "Product display name", example = "FinEdge Edge Cashback Credit Card")
        String productName,

        @NotNull(message = "Card type is required")
        @Schema(description = "Type of card: CREDIT or DEBIT", example = "CREDIT")
        CardType cardType,

        @NotBlank(message = "Payment network is required")
        @Size(max = 30, message = "Network name must not exceed 30 characters")
        @Schema(description = "Payment network: RUPAY, VISA, MASTERCARD", example = "RUPAY")
        String network,

        @Size(max = 255, message = "Short description must not exceed 255 characters")
        @Schema(description = "Short summary of the card product", example = "5% cashback on online spends with RuPay UPI support")
        String shortDescription,

        @Schema(description = "Detailed product description")
        String description,

        @NotNull(message = "Joining fee is required")
        @DecimalMin(value = "0.00", message = "Joining fee cannot be negative")
        @Digits(integer = 13, fraction = 2, message = "Joining fee has invalid monetary precision")
        @Schema(description = "One-time joining fee in INR", example = "499.00")
        BigDecimal joiningFee,

        @NotNull(message = "Annual fee is required")
        @DecimalMin(value = "0.00", message = "Annual fee cannot be negative")
        @Digits(integer = 13, fraction = 2, message = "Annual fee has invalid monetary precision")
        @Schema(description = "Annual recurring maintenance fee in INR", example = "499.00")
        BigDecimal annualFee,

        @NotNull(message = "Forex markup percentage is required")
        @DecimalMin(value = "0.00", message = "Forex markup cannot be negative")
        @DecimalMax(value = "100.00", message = "Forex markup cannot exceed 100%")
        @Digits(integer = 3, fraction = 2, message = "Forex markup has invalid precision")
        @Schema(description = "Foreign currency transaction markup percentage", example = "3.50")
        BigDecimal forexMarkupPercentage,

        @NotNull(message = "Minimum eligibility age is required")
        @Min(value = 18, message = "Minimum eligibility age must be at least 18")
        @Max(value = 100, message = "Minimum eligibility age cannot exceed 100")
        @Schema(description = "Minimum applicant age", example = "21")
        Integer eligibilityMinAge,

        @Min(value = 18, message = "Maximum eligibility age must be at least 18")
        @Max(value = 100, message = "Maximum eligibility age cannot exceed 100")
        @Schema(description = "Maximum applicant age", example = "65")
        Integer eligibilityMaxAge,

        @DecimalMin(value = "0.00", message = "Minimum monthly income cannot be negative")
        @Digits(integer = 13, fraction = 2, message = "Minimum monthly income has invalid monetary precision")
        @Schema(description = "Minimum monthly income requirement in INR", example = "25000.00")
        BigDecimal eligibilityMinMonthlyIncome,

        @Min(value = 0, message = "Credit score cannot be negative")
        @Max(value = 900, message = "Credit score cannot exceed 900")
        @Schema(description = "Minimum CIBIL/Experian credit score", example = "720")
        Integer eligibilityMinCreditScore,

        @Schema(description = "Eligible employment categories", example = "[\"SALARIED\", \"SELF_EMPLOYED\"]")
        List<String> eligibilityEmploymentTypes,

        @Min(value = 0, message = "Income history months cannot be negative")
        @Schema(description = "Required minimum months of verifiable income history", example = "6")
        Integer eligibilityMinIncomeHistoryMonths,

        @Schema(description = "Whether product is active upon creation", example = "true")
        Boolean isActive,

        @Schema(description = "Credit card-specific parameters (required if cardType is CREDIT)")
        CreditCardConfig creditCardConfig,

        @Schema(description = "Debit card-specific parameters (required if cardType is DEBIT)")
        DebitCardConfig debitCardConfig,

        @Schema(description = "Key product benefits")
        List<Map<String, Object>> benefits,

        @Schema(description = "Product features and bullet points")
        List<String> features,

        @Schema(description = "Comprehensive fee and charge schedule")
        List<Map<String, Object>> feesAndCharges,

        @Schema(description = "Step-by-step application instructions")
        List<String> applicationInstructions
) {
}
