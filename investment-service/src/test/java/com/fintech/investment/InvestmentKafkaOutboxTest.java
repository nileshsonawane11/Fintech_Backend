package com.fintech.investment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.investment.entity.Investment;
import com.fintech.investment.entity.InvestmentEnums.InvestmentStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import com.fintech.investment.event.InvestmentKafkaConsumer;
import com.fintech.investment.repository.InvestmentInboxEventRepository;
import com.fintech.investment.repository.InvestmentOpsAlertRepository;
import com.fintech.investment.repository.InvestmentRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InvestmentKafkaOutboxTest {

    @Test
    void kafkaConsumerShouldDeduplicateViaInboxAndRaiseOpsAlert() {
        InvestmentInboxEventRepository inboxRepo = mock(InvestmentInboxEventRepository.class);
        InvestmentRepository invRepo = mock(InvestmentRepository.class);
        InvestmentOpsAlertRepository alertRepo = mock(InvestmentOpsAlertRepository.class);
        ObjectMapper mapper = new ObjectMapper();

        InvestmentKafkaConsumer consumer = new InvestmentKafkaConsumer(inboxRepo, invRepo, alertRepo, mapper);

        String eventJson = """
                {
                  "eventId": "EVT-123",
                  "eventType": "AccountFrozenEvent",
                  "aggregateId": "ACC-999"
                }
                """;

        Investment activeFd = new Investment();
        activeFd.setInvestmentId("INV-FD-1");
        activeFd.setIdentitySubject("sub-1");
        activeFd.setProductId(UUID.randomUUID());
        activeFd.setProductCode("FD_CLASSIC_001");
        activeFd.setProductType(ProductType.FD);
        activeFd.setStatus(InvestmentStatus.ACTIVE);
        activeFd.setPrincipalAmount(new BigDecimal("10000"));
        activeFd.setTotalInvested(new BigDecimal("10000"));
        activeFd.setInterestRate(new BigDecimal("7.50"));
        activeFd.setCompoundingFrequency("QUARTERLY");
        activeFd.setPayoutFrequency("MATURITY");
        activeFd.setTenureMonths(12);
        activeFd.setTenureDays(365);
        activeFd.setStartDate(LocalDate.now());
        activeFd.setMaturityDate(LocalDate.now().plusYears(1));
        activeFd.setMaturityAmount(new BigDecimal("10771"));
        activeFd.setFundingAccountId("ACC-999");
        activeFd.setCertificateNumber("CERT-1");

        when(inboxRepo.existsById("EVT-123")).thenReturn(false).thenReturn(true);
        when(invRepo.findByFundingAccountIdAndStatusIn(eq("ACC-999"), any())).thenReturn(List.of(activeFd));

        // First delivery creates 1 alert and saves inbox
        consumer.onAccountLifecycleEvent(eventJson);
        verify(alertRepo, times(1)).save(any());
        verify(inboxRepo, times(1)).save(any());

        // Duplicate delivery is ignored
        consumer.onAccountLifecycleEvent(eventJson);
        verify(alertRepo, times(1)).save(any());
    }
}
