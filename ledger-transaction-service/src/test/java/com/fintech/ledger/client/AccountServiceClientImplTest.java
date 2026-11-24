package com.fintech.ledger.client;

import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.util.CorrelationIdFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AccountServiceClientImplTest {

    private MockRestServiceServer mockServer;
    private AccountServiceClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ACCOUNT-SERVICE");
        mockServer = MockRestServiceServer.bindTo(builder).build();
        client = new AccountServiceClientImpl(builder.build());
        MDC.put(CorrelationIdFilter.MDC_KEY, "test-correlation-id");
    }

    @Test
    @DisplayName("Hold Integration: Account with no holds returns zero active holds amount")
    void getActiveHoldAmount_withNoHolds_shouldReturnZero() {
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(CorrelationIdFilter.CORRELATION_ID_HEADER, "test-correlation-id"))
                .andRespond(withSuccess(
                        """
                        {
                            "data": [],
                            "pagination": {
                                "nextCursor": null,
                                "hasMore": false,
                                "limit": 100
                            }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        BigDecimal holdAmount = client.getActiveHoldAmount("ACC-1001");

        assertEquals(BigDecimal.ZERO, holdAmount);
        mockServer.verify();
    }

    @Test
    @DisplayName("Hold Integration: Account with single active hold returns exact hold amount")
    void getActiveHoldAmount_withSingleActiveHold_shouldReturnAmount() {
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                            "data": [
                                {
                                    "holdId": "HOLD-1001",
                                    "accountId": "ACC-1001",
                                    "amount": 1500.00,
                                    "currency": "INR",
                                    "reasonCode": "DISPUTE",
                                    "status": "ACTIVE"
                                }
                            ],
                            "pagination": {
                                "nextCursor": null,
                                "hasMore": false,
                                "limit": 100
                            }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        BigDecimal holdAmount = client.getActiveHoldAmount("ACC-1001");

        assertEquals(new BigDecimal("1500.00"), holdAmount);
        mockServer.verify();
    }

    @Test
    @DisplayName("Hold Integration: Multiple active holds are correctly summed")
    void getActiveHoldAmount_withMultipleActiveHolds_shouldReturnSum() {
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                            "data": [
                                {
                                    "holdId": "HOLD-1001",
                                    "accountId": "ACC-1001",
                                    "amount": 1500.00,
                                    "currency": "INR",
                                    "reasonCode": "DISPUTE",
                                    "status": "ACTIVE"
                                },
                                {
                                    "holdId": "HOLD-1002",
                                    "accountId": "ACC-1001",
                                    "amount": 2500.50,
                                    "currency": "INR",
                                    "reasonCode": "FRAUD_CHECK",
                                    "status": "ACTIVE"
                                }
                            ],
                            "pagination": {
                                "nextCursor": null,
                                "hasMore": false,
                                "limit": 100
                            }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        BigDecimal holdAmount = client.getActiveHoldAmount("ACC-1001");

        assertEquals(new BigDecimal("4000.50"), holdAmount);
        mockServer.verify();
    }

    @Test
    @DisplayName("Hold Integration: Released, expired, and cancelled holds are excluded from active hold sum")
    void getActiveHoldAmount_withMixedHoldStatuses_shouldOnlySumActiveHolds() {
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                            "data": [
                                {
                                    "holdId": "HOLD-1001",
                                    "accountId": "ACC-1001",
                                    "amount": 1000.00,
                                    "currency": "INR",
                                    "reasonCode": "DISPUTE",
                                    "status": "ACTIVE"
                                },
                                {
                                    "holdId": "HOLD-1002",
                                    "accountId": "ACC-1001",
                                    "amount": 2000.00,
                                    "currency": "INR",
                                    "reasonCode": "COURT_ORDER",
                                    "status": "RELEASED"
                                },
                                {
                                    "holdId": "HOLD-1003",
                                    "accountId": "ACC-1001",
                                    "amount": 500.00,
                                    "currency": "INR",
                                    "reasonCode": "EXPIRED_TEST",
                                    "status": "EXPIRED"
                                },
                                {
                                    "holdId": "HOLD-1004",
                                    "accountId": "ACC-1001",
                                    "amount": 300.00,
                                    "currency": "INR",
                                    "reasonCode": "CANCELLED_TEST",
                                    "status": "CANCELLED"
                                }
                            ],
                            "pagination": {
                                "nextCursor": null,
                                "hasMore": false,
                                "limit": 100
                            }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        BigDecimal holdAmount = client.getActiveHoldAmount("ACC-1001");

        assertEquals(new BigDecimal("1000.00"), holdAmount);
        mockServer.verify();
    }

    @Test
    @DisplayName("Hold Integration: Cursor pagination aggregates active holds across multiple pages")
    void getActiveHoldAmount_withPagination_shouldAggregateAcrossAllPages() {
        // Page 1
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                            "data": [
                                {
                                    "holdId": "HOLD-1002",
                                    "accountId": "ACC-1001",
                                    "amount": 1000.00,
                                    "currency": "INR",
                                    "status": "ACTIVE"
                                }
                            ],
                            "pagination": {
                                "nextCursor": "HOLD-1002",
                                "hasMore": true,
                                "limit": 100
                            }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        // Page 2
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE&cursor=HOLD-1002"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                            "data": [
                                {
                                    "holdId": "HOLD-1001",
                                    "accountId": "ACC-1001",
                                    "amount": 1500.00,
                                    "currency": "INR",
                                    "status": "ACTIVE"
                                }
                            ],
                            "pagination": {
                                "nextCursor": null,
                                "hasMore": false,
                                "limit": 100
                            }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        BigDecimal holdAmount = client.getActiveHoldAmount("ACC-1001");

        assertEquals(new BigDecimal("2500.00"), holdAmount);
        mockServer.verify();
    }

    @Test
    @DisplayName("Failure Handling: Account not found (404) throws ACCOUNT_NOT_FOUND LedgerException")
    void getActiveHoldAmount_whenAccountNotFound_shouldThrowAccountNotFound() {
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-9999/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        LedgerException ex = assertThrows(LedgerException.class, () -> client.getActiveHoldAmount("ACC-9999"));

        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
        mockServer.verify();
    }

    @Test
    @DisplayName("Failure Handling: Server error (500) throws SERVICE_UNAVAILABLE LedgerException")
    void getActiveHoldAmount_whenServerError_shouldThrowServiceUnavailable() {
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withServerError());

        LedgerException ex = assertThrows(LedgerException.class, () -> client.getActiveHoldAmount("ACC-1001"));

        assertEquals("SERVICE_UNAVAILABLE", ex.getErrorCode());
        mockServer.verify();
    }

    @Test
    @DisplayName("Failure Handling: Blank account ID throws badRequest INVALID_ACCOUNT_ID")
    void getActiveHoldAmount_whenBlankAccountId_shouldThrowBadRequest() {
        LedgerException ex = assertThrows(LedgerException.class, () -> client.getActiveHoldAmount("   "));
        assertEquals("INVALID_ACCOUNT_ID", ex.getErrorCode());
    }

    @Test
    @DisplayName("Hold Retrieval: getAccountHolds returns full hold details including metadata")
    void getAccountHolds_shouldReturnDetailedHoldDtos() {
        mockServer.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001/holds?limit=100&status=ACTIVE"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        """
                        {
                            "data": [
                                {
                                    "holdId": "HOLD-1001",
                                    "accountId": "ACC-1001",
                                    "amount": 1500.00,
                                    "currency": "INR",
                                    "reasonCode": "DISPUTE_LEGAL",
                                    "status": "ACTIVE",
                                    "remarks": "Court order freeze",
                                    "createdBy": "OPS-USER-1"
                                }
                            ],
                            "pagination": {
                                "nextCursor": null,
                                "hasMore": false,
                                "limit": 100
                            }
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        List<AccountHoldDto> holds = client.getAccountHolds("ACC-1001", "ACTIVE");

        assertNotNull(holds);
        assertEquals(1, holds.size());
        AccountHoldDto hold = holds.get(0);
        assertEquals("HOLD-1001", hold.holdId());
        assertEquals("ACC-1001", hold.accountId());
        assertEquals(new BigDecimal("1500.00"), hold.amount());
        assertEquals("DISPUTE_LEGAL", hold.reasonCode());
        assertEquals("ACTIVE", hold.status());
        assertTrue(hold.isActive());
        assertEquals("Court order freeze", hold.remarks());
        assertEquals("OPS-USER-1", hold.createdBy());
        mockServer.verify();
    }
}
