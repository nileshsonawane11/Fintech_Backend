package com.fintech.card.controller;

import com.fintech.card.dto.request.*;
import com.fintech.card.dto.response.*;
import com.fintech.card.service.CardApplicationService;
import com.fintech.card.service.CardService;
import com.fintech.card.service.CardTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardControllerTest {

    @Mock
    private CardApplicationService cardApplicationService;

    @Mock
    private CardService cardService;

    @Mock
    private CardTokenService cardTokenService;

    private CardController cardController;
    private OpsCardController opsCardController;
    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        cardController = new CardController(cardApplicationService, cardService, cardTokenService);
        opsCardController = new OpsCardController(cardApplicationService);

        mockJwt = Jwt.withTokenValue("mock.jwt.token")
                .header("alg", "RS256")
                .claim("sub", "CUS-100234")
                .claim("roles", List.of("CUSTOMER"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    @Test
    void testApplyForCard_FrontendPayload() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setCardType("CREDIT");
        request.setCardName("FinEdge Edge Cashback Card");
        request.setProductSlug("edge-cashback-credit");
        request.setLinkedAccountId("ACC-1001");
        request.setRequestedLimit(new BigDecimal("50000.00"));

        CardApplicationResponse response = new CardApplicationResponse();
        response.setId("CARD-APP-123456");
        response.setCardApplicationId("CARD-APP-123456");
        response.setCardName("FinEdge Edge Cashback Card");
        response.setStatus("PENDING_APPROVAL");
        response.setEstimatedDeliveryTime(LocalDate.now().plusDays(7));

        when(cardApplicationService.applyForCard(eq("CUS-100234"), any(), any(CardApplicationRequest.class)))
                .thenReturn(response);

        ResponseEntity<CardApplicationResponse> entity = cardController.applyForCard(mockJwt, "idem-123", request);

        assertEquals(HttpStatus.ACCEPTED, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertEquals("CARD-APP-123456", entity.getBody().getId());
        assertEquals("FinEdge Edge Cashback Card", entity.getBody().getCardName());
        assertEquals("PENDING_APPROVAL", entity.getBody().getStatus());
    }

    @Test
    void testGetCustomerCards() {
        CardResponse card = new CardResponse();
        card.setId("CARD-3001");
        card.setCardId("CARD-3001");
        card.setCustomerId("CUS-100234");
        card.setCardType("CREDIT");
        card.setCardName("FinEdge Edge Cashback Card");
        card.setMaskedCardNumber("************1234");
        card.setStatus("ACTIVE");

        CardListResponse response = new CardListResponse(List.of(card));
        when(cardService.getCustomerCards("CUS-100234")).thenReturn(response);

        ResponseEntity<CardListResponse> entity = cardController.getCustomerCards(mockJwt);
        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertEquals(1, entity.getBody().getData().size());
        assertEquals("CUS-100234", entity.getBody().getData().get(0).getCustomerId());
    }

    @Test
    void testBlockCard() {
        BlockCardRequest request = new BlockCardRequest();
        request.setReason("LOST");
        request.setRemarks("Card misplaced during travel");

        BlockCardResponse response = new BlockCardResponse();
        response.setId("CARD-3001");
        response.setCardId("CARD-3001");
        response.setStatus("BLOCKED");
        response.setReason("LOST");
        response.setBlockedAt(OffsetDateTime.now());

        when(cardService.blockCard(eq("CUS-100234"), eq("CARD-3001"), any(BlockCardRequest.class)))
                .thenReturn(response);

        ResponseEntity<BlockCardResponse> entity = cardController.blockCard(mockJwt, "CARD-3001", request);
        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertEquals("BLOCKED", entity.getBody().getStatus());
        assertEquals("LOST", entity.getBody().getReason());
    }

    @Test
    void testUpdateControls() {
        UpdateCardControlsRequest request = new UpdateCardControlsRequest();
        request.setControls(Map.of("online", true, "atm", false));
        request.setLimits(Map.of("spendDaily", 35000));

        CardControlsDto controlsDto = new CardControlsDto();
        controlsDto.setOnline(true);
        controlsDto.setAtm(false);
        controlsDto.setDailyLimit(new BigDecimal("35000.00"));

        CardLimitsDto limitsDto = new CardLimitsDto(new BigDecimal("35000.00"), new BigDecimal("25000.00"));
        CardControlResponse response = new CardControlResponse("CARD-3001", controlsDto, limitsDto);

        when(cardService.updateControls(eq("CUS-100234"), eq("CARD-3001"), any(UpdateCardControlsRequest.class)))
                .thenReturn(response);

        ResponseEntity<CardControlResponse> entity = cardController.updateControls(mockJwt, "CARD-3001", request);
        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertTrue(entity.getBody().getControls().isOnline());
        assertFalse(entity.getBody().getControls().isAtm());
        assertEquals(new BigDecimal("35000.00"), entity.getBody().getLimits().getDailySpend());
    }

    @Test
    void testPayCard() {
        PayCardRequest request = new PayCardRequest();
        request.setAccountId("ACC-1001");
        request.setAmount(new BigDecimal("18450.00"));

        PayCardResponse response = new PayCardResponse(true, "PAY-CARD-123456", new BigDecimal("18450.00"), BigDecimal.ZERO);
        when(cardService.payCard(eq("CUS-100234"), eq("CARD-3001"), any(PayCardRequest.class)))
                .thenReturn(response);

        ResponseEntity<PayCardResponse> entity = cardController.payCard(mockJwt, "CARD-3001", request);
        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertNotNull(entity.getBody());
        assertTrue(entity.getBody().isSuccess());
        assertEquals("PAY-CARD-123456", entity.getBody().getReference());
    }

    @Test
    void testOpsApproveAndReject() {
        OpsCardApplicationResponse approveRes = new OpsCardApplicationResponse();
        approveRes.setCardApplicationId("CARD-APP-1001");
        approveRes.setStatus("APPROVED");

        when(cardApplicationService.approveApplication(eq("CARD-APP-1001"), any()))
                .thenReturn(approveRes);

        ResponseEntity<OpsCardApplicationResponse> entity = opsCardController.approveApplication("CARD-APP-1001", new ApproveCardApplicationRequest());
        assertEquals(HttpStatus.OK, entity.getStatusCode());
        assertEquals("APPROVED", entity.getBody().getStatus());

        OpsCardApplicationResponse rejectRes = new OpsCardApplicationResponse();
        rejectRes.setCardApplicationId("CARD-APP-1002");
        rejectRes.setStatus("REJECTED");

        when(cardApplicationService.rejectApplication(eq("CARD-APP-1002"), any()))
                .thenReturn(rejectRes);

        ResponseEntity<OpsCardApplicationResponse> rejectEntity = opsCardController.rejectApplication("CARD-APP-1002", new RejectCardApplicationRequest());
        assertEquals(HttpStatus.OK, rejectEntity.getStatusCode());
        assertEquals("REJECTED", rejectEntity.getBody().getStatus());
    }
}
