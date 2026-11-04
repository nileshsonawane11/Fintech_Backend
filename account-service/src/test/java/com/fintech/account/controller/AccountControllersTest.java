package com.fintech.account.controller;

import com.fintech.account.dto.request.*;
import com.fintech.account.dto.response.*;
import com.fintech.account.enums.*;
import com.fintech.account.service.*;
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
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountControllersTest {

    @Mock
    private AccountProductService productService;

    @Mock
    private AccountApplicationService applicationService;

    @Mock
    private AccountService accountService;

    @Mock
    private AccountLifecycleService lifecycleService;

    @Mock
    private AccountHoldService holdService;

    @Mock
    private NomineeService nomineeService;

    private AccountProductController productController;
    private OpsAccountProductController opsProductController;
    private AccountApplicationController applicationController;
    private OpsAccountApplicationController opsApplicationController;
    private AccountController accountController;
    private OpsAccountLifecycleController opsLifecycleController;
    private OpsAccountHoldController opsHoldController;
    private AccountNomineeController nomineeController;

    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        productController = new AccountProductController(productService);
        opsProductController = new OpsAccountProductController(productService);
        applicationController = new AccountApplicationController(applicationService);
        opsApplicationController = new OpsAccountApplicationController(applicationService);
        accountController = new AccountController(accountService);
        opsLifecycleController = new OpsAccountLifecycleController(lifecycleService);
        opsHoldController = new OpsAccountHoldController(holdService);
        nomineeController = new AccountNomineeController(nomineeService);

        mockJwt = Jwt.withTokenValue("mock-token")
                .header("alg", "RS256")
                .subject("cust-12345")
                .claim("token_use", "ACCESS")
                .build();
    }

    @Test
    void testProductController_listAndDetails() {
        AccountProductResponse prod = new AccountProductResponse(
                "SAVINGS_REGULAR", "Regular Savings", "Desc", AccountType.SAVINGS, "INR",
                new BigDecimal("10000.00"), new BigDecimal("5000.00"), new BigDecimal("3.50"),
                new BigDecimal("100000.00"), new BigDecimal("1000000.00"), 18, null, true, true
        );
        when(productService.listProducts(eq(AccountType.SAVINGS), eq(true), any(), eq(20)))
                .thenReturn(CursorPagedResponse.of(List.of(prod), null, false, 20));
        when(productService.getProductDetails("SAVINGS_REGULAR")).thenReturn(prod);

        ResponseEntity<CursorPagedResponse<AccountProductResponse>> listRes =
                productController.listProducts(AccountType.SAVINGS, true, 20, null);
        assertEquals(HttpStatus.OK, listRes.getStatusCode());
        assertEquals(1, listRes.getBody().data().size());

        ResponseEntity<AccountProductResponse> detailRes = productController.getProductDetails("SAVINGS_REGULAR");
        assertEquals(HttpStatus.OK, detailRes.getStatusCode());
        assertEquals("SAVINGS_REGULAR", detailRes.getBody().productCode());
    }

    @Test
    void testOpsProductController_crud() {
        CreateProductRequest createReq = new CreateProductRequest(
                "SAVINGS_NEW", "New Savings", "Desc", AccountType.SAVINGS, "INR",
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 18, null, true, true
        );
        AccountProductResponse resp = new AccountProductResponse(
                "SAVINGS_NEW", "New Savings", "Desc", AccountType.SAVINGS, "INR",
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 18, null, true, true
        );

        when(productService.createProduct(any(), eq("cust-12345"))).thenReturn(resp);

        ResponseEntity<AccountProductResponse> created = opsProductController.createProduct(createReq, mockJwt);
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        assertEquals("SAVINGS_NEW", created.getBody().productCode());
    }

    @Test
    void testApplicationController_applyAndCancel() {
        AccountApplicationRequest appReq = new AccountApplicationRequest(
                "SAVINGS_REGULAR", new BigDecimal("10000.00"), null);

        AccountApplicationResponse appResp = AccountApplicationResponse.ofSummary(
                "ACC-APP-900123", "CUS-100234", "SAVINGS_REGULAR", ApplicationStatus.PENDING_APPROVAL, Instant.now());

        when(applicationService.apply(eq("cust-12345"), eq("key-uuid"), any())).thenReturn(appResp);

        ResponseEntity<AccountApplicationResponse> applied =
                applicationController.applyForAccount("key-uuid", appReq, mockJwt);
        assertEquals(HttpStatus.ACCEPTED, applied.getStatusCode());
        assertEquals("ACC-APP-900123", applied.getBody().accountApplicationId());

        ResponseEntity<Void> cancelled = applicationController.cancelAccountApplication("ACC-APP-900123", mockJwt);
        assertEquals(HttpStatus.OK, cancelled.getStatusCode());
        verify(applicationService).cancelMyApplication("cust-12345", "ACC-APP-900123");
    }

    @Test
    void testOpsApplicationController_approveAndReject() {
        ApplicationApprovalResponse approvalResp = new ApplicationApprovalResponse(
                "ACC-APP-900123", "APPROVED", "ACC-1001", "OPS-2001", Instant.now());

        when(applicationService.approveApplication(eq("ACC-APP-900123"), eq("cust-12345"), isNull(), any()))
                .thenReturn(approvalResp);

        ResponseEntity<ApplicationApprovalResponse> approved =
                opsApplicationController.approveApplication("ACC-APP-900123", null, null, mockJwt);
        assertEquals(HttpStatus.OK, approved.getStatusCode());
        assertEquals("ACC-1001", approved.getBody().accountId());

        RejectApplicationRequest rejectReq = new RejectApplicationRequest("INSUFFICIENT_DOCS", "Remarks");
        ResponseEntity<Void> rejected = opsApplicationController.rejectApplication("ACC-APP-900123", rejectReq, mockJwt);
        assertEquals(HttpStatus.OK, rejected.getStatusCode());
    }

    @Test
    void testAccountController_detailsAndStatus() {
        AccountDetailResponse detailResp = new AccountDetailResponse(
                "ACC-1001", "************1234", AccountType.SAVINGS, "SAVINGS_REGULAR",
                AccountStatus.ACTIVE, "INR", Instant.now(), new BalanceResponse(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "INR")
        );
        when(accountService.getAccountDetails(eq("cust-12345"), eq("ACC-1001"), anyBoolean())).thenReturn(detailResp);

        ResponseEntity<AccountDetailResponse> res = accountController.getAccountDetails("ACC-1001", mockJwt);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals("ACC-1001", res.getBody().accountId());

        when(accountService.getAccountStatus(eq("cust-12345"), eq("ACC-1001"), anyBoolean()))
                .thenReturn(new AccountStatusResponse("ACC-1001", AccountStatus.ACTIVE, Instant.now()));

        ResponseEntity<AccountStatusResponse> statusRes = accountController.getAccountStatus("ACC-1001", mockJwt);
        assertEquals(HttpStatus.OK, statusRes.getStatusCode());
        assertEquals(AccountStatus.ACTIVE, statusRes.getBody().status());
    }

    @Test
    void testLifecycleController_freezeUnfreezeBlockClose() {
        AccountLifecycleRequest req = new AccountLifecycleRequest("SUSPICIOUS", "Remarks");

        ResponseEntity<Void> freezeRes = opsLifecycleController.freezeAccount("ACC-1001", req, mockJwt);
        assertEquals(HttpStatus.OK, freezeRes.getStatusCode());
        verify(lifecycleService).freezeAccount("ACC-1001", req, "cust-12345");

        ResponseEntity<Void> unfreezeRes = opsLifecycleController.unfreezeAccount("ACC-1001", req, mockJwt);
        assertEquals(HttpStatus.OK, unfreezeRes.getStatusCode());
        verify(lifecycleService).unfreezeAccount("ACC-1001", req, "cust-12345");

        ResponseEntity<Void> blockRes = opsLifecycleController.blockAccount("ACC-1001", req, mockJwt);
        assertEquals(HttpStatus.OK, blockRes.getStatusCode());
        verify(lifecycleService).blockAccount("ACC-1001", req, "cust-12345");

        ResponseEntity<Void> closeRes = opsLifecycleController.closeAccount("ACC-1001", "close-key", req, mockJwt);
        assertEquals(HttpStatus.OK, closeRes.getStatusCode());
        verify(lifecycleService).closeAccount("ACC-1001", "close-key", req, "cust-12345");
    }

    @Test
    void testHoldsController_placeAndRelease() {
        CreateHoldRequest holdReq = new CreateHoldRequest(new BigDecimal("1500.00"), "DISPUTE", "Remarks");
        AccountHoldResponse holdResp = new AccountHoldResponse(
                "HOLD-551122", "ACC-1001", new BigDecimal("1500.00"), "INR", "DISPUTE",
                HoldStatus.ACTIVE, "Remarks", "OPS", null, Instant.now(), null, null
        );

        when(holdService.placeHold(eq("ACC-1001"), eq("hold-key"), any(), eq("cust-12345"))).thenReturn(holdResp);

        ResponseEntity<AccountHoldResponse> placed = opsHoldController.placeHold("ACC-1001", "hold-key", holdReq, mockJwt);
        assertEquals(HttpStatus.CREATED, placed.getStatusCode());
        assertEquals("HOLD-551122", placed.getBody().holdId());

        ReleaseHoldRequest relReq = new ReleaseHoldRequest("RESOLVED", "Remarks");
        AccountHoldResponse releasedResp = new AccountHoldResponse(
                "HOLD-551122", "ACC-1001", new BigDecimal("1500.00"), "INR", "RESOLVED",
                HoldStatus.RELEASED, "Remarks", "OPS", "cust-12345", Instant.now(), Instant.now(), "RESOLVED"
        );
        when(holdService.releaseHold(eq("HOLD-551122"), any(), eq("cust-12345"))).thenReturn(releasedResp);

        ResponseEntity<AccountHoldResponse> released = opsHoldController.releaseHold("HOLD-551122", relReq, mockJwt);
        assertEquals(HttpStatus.OK, released.getStatusCode());
        assertEquals(HoldStatus.RELEASED, released.getBody().status());
    }

    @Test
    void testNomineeController_crud() {
        NomineeRequest req = new NomineeRequest("Sunita", NomineeRelationship.SPOUSE, LocalDate.of(1995, 1, 1), "9812345678", 100);
        UUID nomineeId = UUID.randomUUID();
        AccountNomineeResponse resp = new AccountNomineeResponse(
                nomineeId, "ACC-1001", "Sunita", NomineeRelationship.SPOUSE, LocalDate.of(1995, 1, 1), "******78", 100, Instant.now()
        );

        when(nomineeService.addNominee(eq("cust-12345"), eq("ACC-1001"), any(), eq("cust-12345"))).thenReturn(resp);

        ResponseEntity<AccountNomineeResponse> added = nomineeController.addNominee("ACC-1001", req, mockJwt);
        assertEquals(HttpStatus.CREATED, added.getStatusCode());
        assertEquals(nomineeId, added.getBody().nomineeId());

        ResponseEntity<Void> deleted = nomineeController.deleteNominee("ACC-1001", nomineeId, mockJwt);
        assertEquals(HttpStatus.NO_CONTENT, deleted.getStatusCode());
        verify(nomineeService).deleteNominee("cust-12345", "ACC-1001", nomineeId, "cust-12345");
    }
}
