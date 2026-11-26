package com.fintech.loan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.AcceptLoanOfferRequest;
import com.fintech.loan.dto.request.LoanLifecycleRequests.ApproveLoanRequest;
import com.fintech.loan.dto.request.LoanLifecycleRequests.RejectLoanRequest;
import com.fintech.loan.dto.request.LoanLifecycleRequests.TransitionApplicationRequest;
import com.fintech.loan.dto.response.AcceptOfferResponse;
import com.fintech.loan.dto.response.LoanLifecycleResponses.LoanDisbursementResponse;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProductStatus;
import com.fintech.loan.enums.PublishingStatus;
import com.fintech.loan.event.consumer.LoanKafkaConsumer;
import com.fintech.loan.event.producer.LoanOutboxPublisherTask;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.*;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanLifecycleAndOutboxTest {

    @Mock private LoanApplicationRepository applicationRepository;
    @Mock private LoanApplicationHistoryRepository historyRepository;
    @Mock private LoanOfferRepository offerRepository;
    @Mock private LoanAccountRepository loanAccountRepository;
    @Mock private LoanRepaymentScheduleRepository scheduleRepository;
    @Mock private LoanProductService productService;
    @Mock private AccountServiceClient accountServiceClient;
    @Mock private LoanApplicationService applicationService;
    @Mock private LoanOutboxService outboxService;
    @Mock private LoanNotificationService notificationService;
    @Mock private LoanIdempotencyKeyRepository idempotencyKeyRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private LoanInboxEventRepository inboxEventRepository;
    @Mock private KafkaTemplate<String, String> kafkaTemplate;

    private LoanLifecycleService lifecycleService;
    private LoanOfferService loanOfferService;
    private LoanProduct homeLoan;

    @BeforeEach
    void setUp() {
        LoanFinancialCalculator calculator = new LoanFinancialCalculator();
        RepaymentScheduleService scheduleService = new RepaymentScheduleService(
                loanAccountRepository, scheduleRepository, calculator);

        lifecycleService = new LoanLifecycleService(
                applicationRepository, historyRepository, offerRepository,
                loanAccountRepository, productService, scheduleService,
                calculator, accountServiceClient, applicationService,
                outboxService, notificationService,
                new BigDecimal("10000000.00"), 15,
                LoanConstants.TOPIC_APPLICATION_STATUS_CHANGED,
                LoanConstants.TOPIC_APPLICATION_APPROVED,
                LoanConstants.TOPIC_APPLICATION_REJECTED,
                LoanConstants.TOPIC_APPLICATION_DISBURSED
        );

        LoanIdempotencyService idempotencyService = new LoanIdempotencyService(
                idempotencyKeyRepository, new ObjectMapper().findAndRegisterModules(), 24L);

        loanOfferService = new LoanOfferService(
                offerRepository, applicationRepository, idempotencyService,
                lifecycleService, accountServiceClient, calculator, notificationService
        );

        homeLoan = new LoanProduct();
        homeLoan.setId(UUID.randomUUID());
        homeLoan.setProductCode("HOME_LOAN");
        homeLoan.setLoanCategory(LoanCategory.HOME);
        homeLoan.setStatus(ProductStatus.ACTIVE);
        homeLoan.setMinimumLoanAmount(new BigDecimal("500000.00"));
        homeLoan.setMaximumLoanAmount(new BigDecimal("50000000.00"));
        homeLoan.setMinimumInterestRate(new BigDecimal("8.35"));
        homeLoan.setMaximumInterestRate(new BigDecimal("10.15"));
        homeLoan.setMinimumTenureMonths(60);
        homeLoan.setMaximumTenureMonths(360);
        homeLoan.setInterestCalculationMethod(InterestCalculationMethod.REDUCING_BALANCE);
    }

    @Test
    void fullLifecycleFromSubmittedToDisbursedAndInvalidTransitionRejected() {
        LoanApplication app = new LoanApplication();
        app.setLoanApplicationId("LN-APP-LIFE1");
        app.setCustomerId("CUS-1001");
        app.setIdentitySubject("sub-cust-1");
        app.setProductCode("HOME_LOAN");
        app.setRequestedAmount(new BigDecimal("2000000.00"));
        app.setTenureMonths(120);
        app.setCurrency("INR");
        app.setDisbursementAccountId("ACC-1001");
        app.setEffectiveInterestRate(new BigDecimal("8.35"));
        app.setStatus("SUBMITTED");

        when(applicationRepository.findByLoanApplicationId("LN-APP-LIFE1")).thenReturn(Optional.of(app));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(offerRepository.save(any(LoanOffer.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. Invalid direct jump SUBMITTED -> DISBURSED rejected
        ApiException badJump = assertThrows(ApiException.class,
                () -> lifecycleService.transitionStatus(app, com.fintech.loan.enums.LoanApplicationStatus.DISBURSED,
                        "mgr-1", "LOAN_MANAGER", "skip", "SKIP"));
        assertEquals("INVALID_STATE_TRANSITION", badJump.getCode());

        // 2. SUBMITTED -> UNDER_REVIEW -> DOCUMENT_VERIFICATION -> APPROVED
        lifecycleService.moveToUnderReview("LN-APP-LIFE1", new TransitionApplicationRequest("REVIEW", "Started"),
                "officer-1", "LOAN_OFFICER");
        assertEquals("UNDER_REVIEW", app.getStatus());

        lifecycleService.moveToDocumentVerification("LN-APP-LIFE1", new TransitionApplicationRequest("DOCS_OK", "Docs ok"),
                "officer-1", "LOAN_OFFICER");
        assertEquals("DOCUMENT_VERIFICATION", app.getStatus());

        // Manager limit check: > 10,000,000 denied for non-ADMIN
        ApproveLoanRequest overLimit = new ApproveLoanRequest(new BigDecimal("15000000.00"), new BigDecimal("8.35"), 120, "Over limit");
        assertEquals("APPROVAL_AUTHORITY_EXCEEDED", assertThrows(ApiException.class,
                () -> lifecycleService.approveApplication("LN-APP-LIFE1", overLimit, "mgr-1", "LOAN_MANAGER", false)).getCode());

        // Approve within limit
        ApproveLoanRequest approveReq = new ApproveLoanRequest(new BigDecimal("2000000.00"), new BigDecimal("8.35"), 120, "Sanctioned");
        lifecycleService.approveApplication("LN-APP-LIFE1", approveReq, "mgr-1", "LOAN_MANAGER", false);
        assertEquals("APPROVED", app.getStatus());
        verify(outboxService).enqueueEvent(eq(LoanConstants.TOPIC_APPLICATION_APPROVED), eq("LN-APP-LIFE1"),
                eq("LOAN_APPLICATION"), eq(LoanConstants.EVT_APPLICATION_APPROVED), any());

        // 3. Customer accepts offer -> OFFER_ACCEPTED
        LoanOffer sanctionedOffer = new LoanOffer();
        sanctionedOffer.setOfferId("OFFER-123");
        sanctionedOffer.setLoanApplicationId("LN-APP-LIFE1");
        sanctionedOffer.setSanctionedAmount(new BigDecimal("2000000.00"));
        sanctionedOffer.setInterestRate(new BigDecimal("8.35"));
        sanctionedOffer.setTenureMonths(120);
        sanctionedOffer.setCurrency("INR");
        sanctionedOffer.setStatus("PENDING");
        sanctionedOffer.setExpiresAt(Instant.now().plus(5, ChronoUnit.DAYS));

        when(offerRepository.findByOfferId("OFFER-123")).thenReturn(Optional.of(sanctionedOffer));
        when(offerRepository.findFirstByLoanApplicationIdOrderByCreatedAtDesc("LN-APP-LIFE1"))
                .thenReturn(Optional.of(sanctionedOffer));
        when(accountServiceClient.validateDisbursementAccount("ACC-1001", "sub-cust-1", "CUS-1001", "INR"))
                .thenReturn(new InternalAccountDto("ACC-1001", "****1001", "CUS-1001", "sub-cust-1",
                        "SAVINGS", "SAV", "ACTIVE", "INR", Instant.now()));

        AcceptLoanOfferRequest acceptReq = new AcceptLoanOfferRequest();
        acceptReq.setAcceptedTermsVersion("v1");
        acceptReq.setDisbursementAccountId("ACC-1001");
        AcceptOfferResponse accepted = loanOfferService.acceptOffer("sub-cust-1", "OFFER-123", "idem-accept", acceptReq);
        assertEquals("ACCEPTED", accepted.getStatus());
        assertEquals("OFFER_ACCEPTED", app.getStatus());

        // 4. Disburse loan -> DISBURSED + LoanAccount + Schedule persisted
        when(loanAccountRepository.save(any(LoanAccount.class))).thenAnswer(inv -> inv.getArgument(0));
        when(scheduleRepository.findByLoanAccountIdOrderByInstallmentNumberAsc(any())).thenReturn(List.of());
        when(scheduleRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        LoanDisbursementResponse disbursed = lifecycleService.disburseLoan("LN-APP-LIFE1", "Disburse", "mgr-1", "LOAN_MANAGER");
        assertEquals("DISBURSED", disbursed.status());
        assertEquals("DISBURSED", app.getStatus());
        verify(scheduleRepository).saveAll(argThat((List<LoanRepaymentSchedule> list) -> list.size() == 120));
        verify(outboxService).enqueueEvent(eq(LoanConstants.TOPIC_APPLICATION_DISBURSED), eq("LN-APP-LIFE1"),
                eq("LOAN_APPLICATION"), eq(LoanConstants.EVT_APPLICATION_DISBURSED), any());
    }

    @Test
    void outboxPublisherPublishesAndHandlesRetriesAndFailures() {
        OutboxEvent okEvent = new OutboxEvent();
        okEvent.setId(UUID.randomUUID());
        okEvent.setEventId("evt-ok");
        okEvent.setTopic(LoanConstants.TOPIC_APPLICATION_SUBMITTED);
        okEvent.setAggregateId("LN-APP-1");
        okEvent.setEventType(LoanConstants.EVT_APPLICATION_SUBMITTED);
        okEvent.setPayload("{\"eventId\":\"evt-ok\"}");
        okEvent.setPublishingStatus(PublishingStatus.PENDING);

        OutboxEvent failEvent = new OutboxEvent();
        failEvent.setId(UUID.randomUUID());
        failEvent.setEventId("evt-fail");
        failEvent.setTopic(LoanConstants.TOPIC_APPLICATION_REJECTED);
        failEvent.setAggregateId("LN-APP-2");
        failEvent.setEventType(LoanConstants.EVT_APPLICATION_REJECTED);
        failEvent.setPayload("{\"eventId\":\"evt-fail\"}");
        failEvent.setPublishingStatus(PublishingStatus.PENDING);
        failEvent.setRetryCount(4);

        when(outboxEventRepository.findDueEvents(eq(PublishingStatus.PENDING), any(), eq(5), any()))
                .thenReturn(List.of(okEvent, failEvent));
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(null))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Kafka broker down")));

        LoanOutboxPublisherTask task = new LoanOutboxPublisherTask(outboxEventRepository, kafkaTemplate, 5, 50);
        task.publishPendingEvents();

        assertEquals(PublishingStatus.PUBLISHED, okEvent.getPublishingStatus());
        assertNotNull(okEvent.getPublishedAt());
        assertEquals(PublishingStatus.FAILED, failEvent.getPublishingStatus());
        assertEquals(5, failEvent.getRetryCount());
        assertNotNull(failEvent.getLastError());
    }

    @Test
    void kafkaConsumerIsIdempotentAndAlertsManagerOnAccountClosed() {
        LoanKafkaConsumer consumer = new LoanKafkaConsumer(
                inboxEventRepository, applicationRepository, notificationService,
                new ObjectMapper().findAndRegisterModules()
        );

        String eventJson = """
                {
                  "eventId": "acc-evt-99",
                  "eventType": "AccountClosedEvent",
                  "aggregateId": "ACC-1001",
                  "payload": { "accountId": "ACC-1001" }
                }
                """;

        LoanApplication impactedApp = new LoanApplication();
        impactedApp.setLoanApplicationId("LN-APP-IMPACTED");
        impactedApp.setDisbursementAccountId("ACC-1001");

        when(inboxEventRepository.existsById("acc-evt-99")).thenReturn(false).thenReturn(true);
        when(applicationRepository.findAllByDisbursementAccountIdAndStatusIn(eq("ACC-1001"), anyList()))
                .thenReturn(List.of(impactedApp));

        consumer.onAccountLifecycleEvent(eventJson);
        consumer.onAccountLifecycleEvent(eventJson); // duplicate ignored

        verify(notificationService, times(1)).notifyRole(
                eq(LoanConstants.ROLE_LOAN_MANAGER), isNull(), eq("DISBURSEMENT_ACCOUNT_ALERT"),
                anyString(), anyString(), eq("LN-APP-IMPACTED"));
    }
}
