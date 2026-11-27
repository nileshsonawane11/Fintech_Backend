package com.fintech.investment.controller;

import com.fintech.investment.calculator.*;
import com.fintech.investment.calculator.CalculationDtos.*;
import com.fintech.investment.entity.InvestmentProduct;
import com.fintech.investment.service.InvestmentProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@RestController
@RequestMapping("/api/v1/investments/calculators")
@Tag(name = "Investment Calculators", description = "Authoritative BigDecimal financial preview calculators for FD, RD, SIP, and SSY")
public class InvestmentCalculatorController {

    private final FdCalculator fdCalculator;
    private final RdCalculator rdCalculator;
    private final SipCalculator sipCalculator;
    private final SsyCalculator ssyCalculator;
    private final InvestmentProductService productService;

    public InvestmentCalculatorController(
            FdCalculator fdCalculator,
            RdCalculator rdCalculator,
            SipCalculator sipCalculator,
            SsyCalculator ssyCalculator,
            InvestmentProductService productService) {
        this.fdCalculator = fdCalculator;
        this.rdCalculator = rdCalculator;
        this.sipCalculator = sipCalculator;
        this.ssyCalculator = ssyCalculator;
        this.productService = productService;
    }

    public record FdPreviewRequest(
            String productCode,
            @NotNull @DecimalMin("1.00") BigDecimal principal,
            @NotNull @Min(1) Integer tenureMonths,
            Integer tenureDays,
            CompoundingFrequency compoundingFrequency,
            PayoutFrequency payoutFrequency
    ) {}

    public record RdPreviewRequest(
            String productCode,
            @NotNull @DecimalMin("1.00") BigDecimal monthlyInstallment,
            @NotNull @Min(1) Integer tenureMonths
    ) {}

    public record SipPreviewRequest(
            @NotNull @DecimalMin("1.00") BigDecimal monthlyInvestment,
            @NotNull @Min(1) Integer tenureMonths,
            @NotNull @DecimalMin("0.00") @DecimalMax("35.00") BigDecimal assumedAnnualReturnPct
    ) {}

    public record SsyPreviewRequest(
            String productCode,
            @NotNull @DecimalMin("250.00") @DecimalMax("150000.00") BigDecimal annualDeposit
    ) {}

    @PostMapping("/fd")
    @Operation(summary = "Calculate Fixed Deposit maturity and periodic payout preview")
    public FdCalculationResult previewFd(@Valid @RequestBody FdPreviewRequest req) {
        InvestmentProduct product = productService.findActiveByCodeOrThrow(
                req.productCode() != null ? req.productCode() : "FD_CLASSIC_001");
        LocalDate start = LocalDate.now();
        int days = (req.tenureDays() != null && req.tenureDays() > 0)
                ? req.tenureDays()
                : (int) ChronoUnit.DAYS.between(start, start.plusMonths(req.tenureMonths()));
        BigDecimal rate = productService.resolveApplicableRate(product, days, req.principal(), start);
        return fdCalculator.calculate(
                req.principal(),
                rate,
                start,
                req.tenureMonths(),
                req.tenureDays(),
                req.compoundingFrequency() != null ? req.compoundingFrequency() : CompoundingFrequency.QUARTERLY,
                req.payoutFrequency() != null ? req.payoutFrequency() : PayoutFrequency.MATURITY,
                product.getMaxLtvPct()
        );
    }

    @PostMapping("/rd")
    @Operation(summary = "Calculate Recurring Deposit maturity preview")
    public RdCalculationResult previewRd(@Valid @RequestBody RdPreviewRequest req) {
        InvestmentProduct product = productService.findActiveByCodeOrThrow(
                req.productCode() != null ? req.productCode() : "RD_FLEXI_001");
        LocalDate start = LocalDate.now();
        int days = (int) ChronoUnit.DAYS.between(start, start.plusMonths(req.tenureMonths()));
        BigDecimal rate = productService.resolveApplicableRate(product, days, req.monthlyInstallment(), start);
        return rdCalculator.calculate(req.monthlyInstallment(), req.tenureMonths(), rate, start);
    }

    @PostMapping("/sip")
    @Operation(summary = "Calculate illustrative (non-guaranteed) SIP projection")
    public SipCalculationResult previewSip(@Valid @RequestBody SipPreviewRequest req) {
        return sipCalculator.calculateIllustrative(
                req.monthlyInvestment(), req.tenureMonths(), req.assumedAnnualReturnPct());
    }

    @PostMapping("/ssy")
    @Operation(summary = "Calculate Sukanya Samriddhi Yojana (SSY) demonstration projection")
    public SsyCalculationResult previewSsy(@Valid @RequestBody SsyPreviewRequest req) {
        InvestmentProduct product = productService.findActiveByCodeOrThrow(
                req.productCode() != null ? req.productCode() : "SSY_GOV_001");
        LocalDate start = LocalDate.now();
        BigDecimal rate = productService.resolveApplicableRate(product, 7665, req.annualDeposit(), start);
        return ssyCalculator.calculate(req.annualDeposit(), rate, 15, 21, start);
    }
}
