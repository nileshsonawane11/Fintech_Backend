package com.fintech.card.service;

import com.fintech.card.dto.request.BlockCardRequest;
import com.fintech.card.dto.request.PayCardRequest;
import com.fintech.card.dto.request.UpdateCardControlsRequest;
import com.fintech.card.dto.response.BlockCardResponse;
import com.fintech.card.dto.response.CardControlResponse;
import com.fintech.card.dto.response.CardListResponse;
import com.fintech.card.dto.response.CardResponse;
import com.fintech.card.dto.response.PayCardResponse;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardControl;
import com.fintech.card.exception.ApiException;
import com.fintech.card.repository.CardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardServiceTest {

    @Mock
    private CardRepository cardRepository;

    private CardService cardService;

    @BeforeEach
    void setUp() {
        cardService = new CardService(cardRepository);
    }

    @Test
    void testGetCustomerCards_IncludesCustomerIdAndCanonicalFields() {
        Card card = new Card();
        card.setId("uuid-1");
        card.setCardId("CARD-3001");
        card.setCustomerId("CUS-100234");
        card.setCardType("CREDIT");
        card.setCardNumber("4532123456781234");
        card.setMaskedCardNumber("************1234");
        card.setStatus("ACTIVE");
        card.setLinkedAccountId("ACC-1001");
        card.setExpiryMonth(12);
        card.setExpiryYear(2030);

        CardControl ctrl = new CardControl();
        ctrl.setCard(card);
        ctrl.setOnlineEnabled(true);
        ctrl.setAtmWithdrawalEnabled(true);
        ctrl.setInternationalEnabled(false);
        ctrl.setContactlessEnabled(true);
        ctrl.setDailyLimit(new BigDecimal("150000.00"));
        card.setCardControl(ctrl);

        when(cardRepository.findByIdentitySubjectOrCustomerId("CUS-100234", "CUS-100234")).thenReturn(List.of(card));

        CardListResponse response = cardService.getCustomerCards("CUS-100234");
        assertNotNull(response);
        assertEquals(1, response.getData().size());

        var cardDto = response.getData().get(0);
        assertEquals("CARD-3001", cardDto.getCardId());
        assertEquals("CUS-100234", cardDto.getCustomerId(), "customerId must be present for frontend filtering");
        assertEquals("CREDIT", cardDto.getCardType());
        assertEquals("FinEdge Edge Cashback Card", cardDto.getProductName());
        assertEquals("edge-cashback-credit", cardDto.getProductSlug());
        assertEquals("12/30", cardDto.getExpiryDate());
        assertNotNull(cardDto.getControls());
        assertTrue(cardDto.getControls().isOnline());
        assertTrue(cardDto.getControls().isAtm());
        assertEquals(new BigDecimal("150000.00"), cardDto.getLimits().getDailySpend());
    }

    @Test
    void testBlockCard_Success() {
        Card card = new Card();
        card.setCardId("CARD-3001");
        card.setCustomerId("CUS-100234");
        card.setStatus("ACTIVE");

        when(cardRepository.findByCardId("CARD-3001")).thenReturn(Optional.of(card));
        when(cardRepository.save(any(Card.class))).thenAnswer(i -> i.getArgument(0));

        BlockCardRequest request = new BlockCardRequest();
        request.setReason("LOST");
        request.setRemarks("Card misplaced in taxi");

        BlockCardResponse response = cardService.blockCard("CUS-100234", "CARD-3001", request);
        assertEquals("CARD-3001", response.getCardId());
        assertEquals("BLOCKED", response.getStatus());
        assertEquals("LOST", response.getReason());
        assertNotNull(response.getBlockedAt());
        assertEquals("BLOCKED", card.getStatus());
    }

    @Test
    void testBlockCard_AlreadyBlocked_ThrowsConflict() {
        Card card = new Card();
        card.setCardId("CARD-3001");
        card.setCustomerId("CUS-100234");
        card.setStatus("BLOCKED");

        when(cardRepository.findByCardId("CARD-3001")).thenReturn(Optional.of(card));

        BlockCardRequest request = new BlockCardRequest();
        request.setReason("LOST");

        ApiException ex = assertThrows(ApiException.class, () ->
                cardService.blockCard("CUS-100234", "CARD-3001", request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void testUpdateControls_WithFrontendNestedControlsAndLimits() {
        Card card = new Card();
        card.setCardId("CARD-3001");
        card.setCustomerId("CUS-100234");
        card.setStatus("ACTIVE");

        CardControl ctrl = new CardControl();
        ctrl.setCard(card);
        ctrl.setOnlineEnabled(true);
        ctrl.setAtmWithdrawalEnabled(true);
        ctrl.setDailyLimit(new BigDecimal("50000.00"));
        card.setCardControl(ctrl);

        when(cardRepository.findByCardId("CARD-3001")).thenReturn(Optional.of(card));
        when(cardRepository.save(any(Card.class))).thenAnswer(i -> i.getArgument(0));

        UpdateCardControlsRequest request = new UpdateCardControlsRequest();
        request.setControls(Map.of("atm", false, "contactless", false));
        request.setLimits(Map.of("spendDaily", 75000.00, "atmWithdrawal", 15000.00));

        CardControlResponse response = cardService.updateControls("CUS-100234", "CARD-3001", request);
        assertNotNull(response);
        assertFalse(response.getControls().isAtm());
        assertFalse(response.getControls().isContactless());
        assertEquals(new BigDecimal("75000.0"), response.getLimits().getDailySpend());
        assertEquals(new BigDecimal("15000.0"), response.getLimits().getAtmWithdrawal());
    }

    @Test
    void testPayCard_Success() {
        Card card = new Card();
        card.setCardId("CARD-3001");
        card.setCustomerId("CUS-100234");
        card.setStatus("ACTIVE");

        when(cardRepository.findByCardId("CARD-3001")).thenReturn(Optional.of(card));

        PayCardRequest request = new PayCardRequest();
        request.setAccountId("ACC-1001");
        request.setAmount(new BigDecimal("5000.00"));

        PayCardResponse response = cardService.payCard("CUS-100234", "CARD-3001", request);
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getReference().startsWith("PAY-CARD-"));
        assertEquals(new BigDecimal("5000.00"), response.getPaidAmount());
        assertEquals(BigDecimal.ZERO, response.getOutstandingAfter());
    }

    @Test
    void testGetCardById_MatchesByIdentitySubject() {
        Card card = new Card();
        card.setCardId("CARD-3001");
        card.setCustomerId("CUS-100234");
        card.setIdentitySubject("auth0|vikram");
        card.setStatus("ACTIVE");

        when(cardRepository.findByCardId("CARD-3001")).thenReturn(Optional.of(card));

        CardResponse response = cardService.getCardById("auth0|vikram", "CARD-3001");
        assertNotNull(response);
        assertEquals("CARD-3001", response.getCardId());
        assertEquals("auth0|vikram", response.getIdentitySubject());
    }
}
