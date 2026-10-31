package com.fintech.identity.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class RolePortalsAuthorizationTest {

    private final CustomerPortalController customerPortalController = new CustomerPortalController();
    private final OperationsPortalController operationsPortalController = new OperationsPortalController();
    private final ManagerPortalController managerPortalController = new ManagerPortalController();

    @Test
    @DisplayName("Customer account endpoint returns success")
    void testCustomerAccountEndpoint() {
        Map<String, Object> response = customerPortalController.getCustomerAccount();
        assertEquals("SUCCESS", response.get("status"));
    }

    @Test
    @DisplayName("Operations view customers endpoint returns success")
    void testOperationsViewCustomersEndpoint() {
        Map<String, Object> response = operationsPortalController.viewCustomers();
        assertEquals("SUCCESS", response.get("status"));
    }

    @Test
    @DisplayName("Operations KYC review endpoint returns success")
    void testOperationsKycReviewEndpoint() {
        Map<String, Object> response = operationsPortalController.reviewKyc();
        assertEquals("SUCCESS", response.get("status"));
    }

    @Test
    @DisplayName("Operations KYC approve endpoint returns success")
    void testOperationsKycApproveEndpoint() {
        Map<String, Object> response = operationsPortalController.approveKyc();
        assertEquals("SUCCESS", response.get("status"));
        assertEquals("KYC approved successfully.", response.get("message"));
    }

    @Test
    @DisplayName("Manager view reports endpoint returns success")
    void testManagerReportsEndpoint() {
        Map<String, Object> response = managerPortalController.viewReports();
        assertEquals("SUCCESS", response.get("status"));
    }

    @Test
    @DisplayName("Manager freeze account endpoint returns success")
    void testManagerFreezeAccountEndpoint() {
        UUID accountId = UUID.randomUUID();
        Map<String, Object> response = managerPortalController.freezeAccount(accountId);
        assertEquals("SUCCESS", response.get("status"));
        assertEquals(accountId.toString(), response.get("accountId"));
    }
}
