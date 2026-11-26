package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.CreateLoanOfferRequest;
import com.fintech.loan.dto.request.UpdateLoanOfferRequest;
import com.fintech.loan.dto.response.DynamicOfferResponses.DynamicOfferResponse;
import com.fintech.loan.entity.LoanApplicationOfferSnapshot;
import com.fintech.loan.entity.LoanOfferCampaign;
import com.fintech.loan.entity.LoanOfferVersion;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.enums.DiscountType;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.OfferStatus;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.repository.LoanApplicationOfferSnapshotRepository;
import com.fintech.loan.repository.LoanOfferCampaignRepository;
import com.fintech.loan.repository.LoanOfferVersionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DynamicLoanOfferServiceTest {

    @Mock private LoanOfferCampaignRepository offerRepository;
    @Mock private LoanOfferVersionRepository versionRepository;
    @Mock private LoanApplicationOfferSnapshotRepository snapshotRepository;
    @Mock private LoanOutboxService outboxService;
    @Mock private LoanNotificationService notificationService;

    private DynamicLoanOfferService offerService;
    private LoanProduct homeLoan;

    @BeforeEach
    void setUp() {
        offerService = new DynamicLoanOfferService(
                offerRepository, versionRepository, snapshotRepository,
                outboxService, notificationService,
                LoanConstants.TOPIC_OFFER_CREATED, LoanConstants.TOPIC_OFFER_UPDATED,
                LoanConstants.TOPIC_OFFER_ACTIVATED, LoanConstants.TOPIC_OFFER_DEACTIVATED
        );
        homeLoan = new LoanProduct();
        homeLoan.setId(UUID.randomUUID());
        homeLoan.setProductCode("HOME_LOAN");
        homeLoan.setLoanCategory(LoanCategory.HOME);
    }

    @Test
    void offerUpdateIncrementsVersionWithoutModifyingHistoricalApplicationSnapshots() {
        LoanOfferCampaign offer = new LoanOfferCampaign();
        offer.setId(UUID.randomUUID());
        offer.setOfferCode("HOME_OFFER_2026");
        offer.setOfferName("Festive Home Offer");
        offer.setStatus(OfferStatus.ACTIVE);
        offer.setCurrentVersion(1);
        offer.setValidFrom(Instant.now().minus(5, ChronoUnit.DAYS));
        offer.setValidTo(Instant.now().plus(30, ChronoUnit.DAYS));
        offer.setActivatedAt(Instant.now().minus(5, ChronoUnit.DAYS));
        offer.setApplicableProductCodes(List.of("HOME_LOAN"));
        offer.setDiscountType(DiscountType.INTEREST_RATE_DISCOUNT);
        offer.setInterestRateDiscount(new BigDecimal("0.20"));
        offer.setPriority(10);

        when(offerRepository.findCurrentlyActiveOffers(eq(OfferStatus.ACTIVE), any())).thenReturn(List.of(offer));
        when(snapshotRepository.save(any(LoanApplicationOfferSnapshot.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. Application submitted under v1 gets 0.20% discount
        LoanApplicationOfferSnapshot app1Snap = offerService.evaluateAndSnapshotBestOffer(
                "LN-APP-001", homeLoan, new BigDecimal("8.50"), new BigDecimal("10000.00"),
                new BigDecimal("2500000.00"), 120, new BigDecimal("90000.00"), "SALARIED",
                Instant.now()
        ).orElseThrow();

        assertEquals(1, app1Snap.getOfferVersion());
        assertEquals(new BigDecimal("8.30"), app1Snap.getEffectiveInterestRate());

        // 2. Admin updates offer -> becomes v2 with 0.35% discount
        when(offerRepository.findByOfferCodeIgnoreCase("HOME_OFFER_2026")).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(LoanOfferCampaign.class))).thenAnswer(inv -> inv.getArgument(0));
        when(versionRepository.save(any(LoanOfferVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        DynamicOfferResponse updated = offerService.updateOffer(
                "HOME_OFFER_2026",
                new UpdateLoanOfferRequest(null, null, null, null, null, null, null, null,
                        new BigDecimal("0.35"), null, null, null, null, null, null),
                "admin-1"
        );
        assertEquals(2, updated.currentVersion());

        // 3. New application receives v2 (0.35% discount), while app1Snap remains untouched at v1 / 8.30%
        LoanApplicationOfferSnapshot app2Snap = offerService.evaluateAndSnapshotBestOffer(
                "LN-APP-002", homeLoan, new BigDecimal("8.50"), new BigDecimal("10000.00"),
                new BigDecimal("2500000.00"), 120, new BigDecimal("90000.00"), "SALARIED",
                Instant.now()
        ).orElseThrow();

        assertEquals(2, app2Snap.getOfferVersion());
        assertEquals(new BigDecimal("8.15"), app2Snap.getEffectiveInterestRate());
        // Historical snapshot never mutated
        assertEquals(1, app1Snap.getOfferVersion());
        assertEquals(new BigDecimal("8.30"), app1Snap.getEffectiveInterestRate());
    }

    @Test
    void offerActivatedAfterApplicationTimestampDoesNotApplyRetroactively() {
        Instant appTime = Instant.now().minus(1, ChronoUnit.HOURS);

        LoanOfferCampaign futureActivatedOffer = new LoanOfferCampaign();
        futureActivatedOffer.setId(UUID.randomUUID());
        futureActivatedOffer.setOfferCode("NEW_OFFER");
        futureActivatedOffer.setOfferName("Just Activated Offer");
        futureActivatedOffer.setStatus(OfferStatus.ACTIVE);
        futureActivatedOffer.setCurrentVersion(1);
        futureActivatedOffer.setValidFrom(Instant.now().minus(2, ChronoUnit.DAYS));
        futureActivatedOffer.setValidTo(Instant.now().plus(10, ChronoUnit.DAYS));
        // Activated AFTER appTime
        futureActivatedOffer.setActivatedAt(Instant.now());
        futureActivatedOffer.setApplicableProductCodes(List.of("HOME_LOAN"));
        futureActivatedOffer.setDiscountType(DiscountType.INTEREST_RATE_DISCOUNT);
        futureActivatedOffer.setInterestRateDiscount(new BigDecimal("0.50"));

        when(offerRepository.findCurrentlyActiveOffers(eq(OfferStatus.ACTIVE), eq(appTime)))
                .thenReturn(List.of(futureActivatedOffer));

        Optional<LoanApplicationOfferSnapshot> snap = offerService.evaluateAndSnapshotBestOffer(
                "LN-APP-PAST", homeLoan, new BigDecimal("8.50"), new BigDecimal("10000.00"),
                new BigDecimal("2000000.00"), 120, new BigDecimal("80000.00"), "SALARIED",
                appTime
        );

        assertTrue(snap.isEmpty(), "Offer activated after application submission must not apply retroactively");
    }

    @Test
    void offerEligibilityChecksEnforcedServerSide() {
        LoanOfferCampaign highValueOffer = new LoanOfferCampaign();
        highValueOffer.setId(UUID.randomUUID());
        highValueOffer.setOfferCode("HIGH_VALUE_ONLY");
        highValueOffer.setOfferName("High Value Salaried Offer");
        highValueOffer.setStatus(OfferStatus.ACTIVE);
        highValueOffer.setCurrentVersion(1);
        highValueOffer.setValidFrom(Instant.now().minus(1, ChronoUnit.DAYS));
        highValueOffer.setValidTo(Instant.now().plus(10, ChronoUnit.DAYS));
        highValueOffer.setActivatedAt(Instant.now().minus(1, ChronoUnit.DAYS));
        highValueOffer.setApplicableProductCodes(List.of("HOME_LOAN"));
        highValueOffer.setEligibilityConditions(Map.of(
                "minLoanAmount", 5000000,
                "employmentTypes", List.of("SALARIED")
        ));
        highValueOffer.setDiscountType(DiscountType.PROCESSING_FEE_DISCOUNT);
        highValueOffer.setProcessingFeeDiscountPercentage(new BigDecimal("100.00"));

        when(offerRepository.findCurrentlyActiveOffers(eq(OfferStatus.ACTIVE), any()))
                .thenReturn(List.of(highValueOffer));

        // Amount below minLoanAmount -> not eligible
        Optional<LoanApplicationOfferSnapshot> ineligible = offerService.evaluateAndSnapshotBestOffer(
                "LN-APP-SMALL", homeLoan, new BigDecimal("8.50"), new BigDecimal("10000.00"),
                new BigDecimal("1000000.00"), 120, new BigDecimal("80000.00"), "SALARIED",
                Instant.now()
        );
        assertTrue(ineligible.isEmpty());
    }

    @Test
    void deactivatedOfferDoesNotApplyToNewApplications() {
        LoanOfferCampaign offer = new LoanOfferCampaign();
        offer.setId(UUID.randomUUID());
        offer.setOfferCode("DEACT_OFFER");
        offer.setOfferName("To Deactivate");
        offer.setStatus(OfferStatus.ACTIVE);
        offer.setCurrentVersion(1);
        offer.setValidFrom(Instant.now().minus(1, ChronoUnit.DAYS));
        offer.setValidTo(Instant.now().plus(10, ChronoUnit.DAYS));
        offer.setDiscountType(DiscountType.CASHBACK);

        when(offerRepository.findByOfferCodeIgnoreCase("DEACT_OFFER")).thenReturn(Optional.of(offer));
        when(offerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        DynamicOfferResponse res = offerService.deactivateOffer("DEACT_OFFER", "admin-1");
        assertEquals(OfferStatus.INACTIVE, res.status());
        verify(outboxService).enqueueEvent(eq(LoanConstants.TOPIC_OFFER_DEACTIVATED), eq("DEACT_OFFER"),
                eq("LOAN_OFFER"), eq(LoanConstants.EVT_OFFER_DEACTIVATED), any());
    }
}
