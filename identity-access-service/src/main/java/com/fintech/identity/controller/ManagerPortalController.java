package com.fintech.identity.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/manager")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerPortalController {

    @GetMapping("/reports")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public Map<String, Object> viewReports() {
        return Map.of(
                "status", "SUCCESS",
                "message", "Management reports retrieved successfully."
        );
    }

    @PostMapping("/accounts/{accountId}/freeze")
    @PreAuthorize("hasAuthority('ACCOUNT_FREEZE')")
    public Map<String, Object> freezeAccount(@PathVariable UUID accountId) {
        return Map.of(
                "status", "SUCCESS",
                "accountId", accountId.toString(),
                "message", "Account frozen successfully."
        );
    }
}
