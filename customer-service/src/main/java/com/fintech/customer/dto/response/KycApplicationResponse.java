
package com.fintech.customer.dto.response;

import java.time.Instant;

public record KycApplicationResponse(
        String kycCaseId,
        String customerId,
        String status,
        Instant estimatedCompletionTime
) {}