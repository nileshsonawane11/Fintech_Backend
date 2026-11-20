package com.fintech.card.service;

import com.fintech.card.dto.request.ApproveCardApplicationRequest;
import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.request.RejectCardApplicationRequest;
import com.fintech.card.dto.response.CardApplicationResponse;
import com.fintech.card.dto.response.OpsCardApplicationResponse;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardApplication;
import com.fintech.card.entity.CardApplicationIdempotencyKey;
import com.fintech.card.exception.ApiException;
import com.fintech.card.repository.CardApplicationIdempotencyKeyRepository;
import com.fintech.card.repository.CardApplicationRepository;
import com.fintech.card.repository.CardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardApplicationServiceTest {

    @Mock
    private CardApplicationRepository cardApplicationRepository;

    @Mock
    private CardApplicationIdempotencyKeyRepository idempotencyKeyRepository;

    @Mock
    private CardRepository cardRepository;

    private CardApplicationService cardApplicationService;

    @BeforeEach
    void setUp() {
        cardApplicationService = new CardApplicationService(cardApplicationRepository, idempotencyKeyRepository, cardRepository);
    }

    @Test
    void testApplyForCard_WithFrontendPayload_Succeeds() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setCardType("CREDIT");
        request.setCardName("FinEdge Edge Cashback Card");
        request.setProductSlug("edge-cashback-credit");
        request.setLinkedAccountId("ACC-1001");
        request.setRequestedLimit(new BigDecimal("50000.00"));

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(cardApplicationRepository.save(any(CardApplication.class))).thenAnswer(i -> i.getArgument(0));

        CardApplicationResponse response = cardApplicationService.applyForCard("CUS-100234", "idem-001", request);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertNotNull(response.getCardApplicationId());
        assertEquals(response.getId(), response.getCardApplicationId());
        assertEquals("FinEdge Edge Cashback Card", response.getCardName());
        assertEquals("PENDING_APPROVAL", response.getStatus());
        assertNotNull(response.getEstimatedDeliveryTime());
        verify(idempotencyKeyRepository).save(any(CardApplicationIdempotencyKey.class));
    }

    @Test
    void testApplyForCard_IdempotencyReplay() {
        CardApplicationIdempotencyKey key = new CardApplicationIdempotencyKey();
        key.setIdempotencyKey("idem-replay");
        key.setCardApplicationId("CARD-APP-EXISTING");

        CardApplication existing = new CardApplication();
        existing.setCardApplicationId("CARD-APP-EXISTING");
        existing.setCustomerId("CUS-100234");
        existing.setCardType("CREDIT");
        existing.setStatus("PENDING_APPROVAL");
        existing.setEstimatedDeliveryDate(LocalDate.now().plusDays(7));

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-replay")).thenReturn(Optional.of(key));
        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-EXISTING")).thenReturn(Optional.of(existing));

        CardApplicationRequest request = new CardApplicationRequest();
        CardApplicationResponse response = cardApplicationService.applyForCard("CUS-100234", "idem-replay", request);

        assertEquals("CARD-APP-EXISTING", response.getCardApplicationId());
        assertEquals("PENDING_APPROVAL", response.getStatus());
        verify(cardApplicationRepository, never()).save(any(CardApplication.class));
    }

    @Test
    void testOpsApproveApplication_IssuesCard() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-1001");
        app.setCustomerId("CUS-100234");
        app.setCardType("CREDIT");
        app.setLinkedAccountId("ACC-1001");
        app.setDeliveryAddressId("ADDR-1001");
        app.setStatus("PENDING_APPROVAL");

        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-1001")).thenReturn(Optional.of(app));
        when(cardApplicationRepository.save(any(CardApplication.class))).thenAnswer(i -> i.getArgument(0));
        when(cardRepository.save(any(Card.class))).thenAnswer(i -> i.getArgument(0));

        ApproveCardApplicationRequest request = new ApproveCardApplicationRequest();
        request.setApprovedLimit(new BigDecimal("200000.00"));

        OpsCardApplicationResponse response = cardApplicationService.approveApplication("CARD-APP-1001", request);

        assertEquals("APPROVED", response.getStatus());
        assertEquals(new BigDecimal("200000.00"), response.getApprovedLimit());
        verify(cardRepository).save(any(Card.class));
    }

    @Test
    void testOpsRejectApplication_SetsRejected() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-1002");
        app.setCustomerId("CUS-100235");
        app.setStatus("PENDING_APPROVAL");

        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-1002")).thenReturn(Optional.of(app));

        RejectCardApplicationRequest request = new RejectCardApplicationRequest();
        request.setRemarks("Credit score threshold not met");

        OpsCardApplicationResponse response = cardApplicationService.rejectApplication("CARD-APP-1002", request);

        assertEquals("REJECTED", response.getStatus());
        assertEquals("Credit score threshold not met", response.getRejectionReason());
    }
}
