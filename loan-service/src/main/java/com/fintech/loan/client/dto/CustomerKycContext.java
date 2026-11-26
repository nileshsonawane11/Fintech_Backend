package com.fintech.loan.client.dto;

import java.util.List;

public record CustomerKycContext(
        CustomerProfileDto profile,
        KycApplicationDto kycCase,
        List<KycDocumentDto> documents
) {
}
