package com.fintech.card.dto.response;

import com.fintech.card.entity.config.CreditCardConfig;
import com.fintech.card.entity.config.DebitCardConfig;
import com.fintech.card.enums.CardType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Schema(description = "Public card product details for customer catalog and discovery")
public record PublicCardProductResponse(
        @Schema(description = "Product unique identifier", example = "c0000000-0000-0000-0000-000000000001")
        UUID id,

        @Schema(description = "Unique product code", example = "EDGE_CASHBACK_CARD")
        String productCode,

        @Schema(description = "Product display name", example = "FinEdge Edge Cashback Credit Card")
        String productName,

        @Schema(description = "Card type: CREDIT or DEBIT", example = "CREDIT")
        CardType cardType,

        @Schema(description = "Payment network: RUPAY, VISA, MASTERCARD", example = "RUPAY")
        String network,

        @Schema(description = "Short summary of the product")
        String shortDescription,

        @Schema(description = "Detailed product description")
        String description,

        @Schema(description = "Joining fee in INR", example = "499.00")
        BigDecimal joiningFee,

        @Schema(description = "Annual recurring fee in INR", example = "499.00")
        BigDecimal annualFee,

        @Schema(description = "Forex markup percentage", example = "3.50")
        BigDecimal forexMarkupPercentage,

        @Schema(description = "Minimum eligibility age", example = "21")
        Integer eligibilityMinAge,

        @Schema(description = "Maximum eligibility age", example = "65")
        Integer eligibilityMaxAge,

        @Schema(description = "Minimum monthly income in INR", example = "25000.00")
        BigDecimal eligibilityMinMonthlyIncome,

        @Schema(description = "Minimum credit score", example = "720")
        Integer eligibilityMinCreditScore,

        @Schema(description = "Eligible employment categories")
        List<String> eligibilityEmploymentTypes,

        @Schema(description = "Required months of income history", example = "6")
        Integer eligibilityMinIncomeHistoryMonths,

        @Schema(description = "Credit card-specific parameters (present for CREDIT cards)")
        CreditCardConfig creditCardConfig,

        @Schema(description = "Debit card-specific parameters (present for DEBIT cards)")
        DebitCardConfig debitCardConfig,

        @Schema(description = "Key product benefits")
        List<Map<String, Object>> benefits,

        @Schema(description = "Product features")
        List<String> features,

        @Schema(description = "Fee and charge schedule")
        List<Map<String, Object>> feesAndCharges,

        @Schema(description = "Application instructions and requirements")
        List<String> applicationInstructions
) {
}
