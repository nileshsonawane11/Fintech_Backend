
package com.fintech.customer.service;

import com.fintech.customer.dto.response.KycApplicationDetailsResponse;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.KycDocument;
import com.fintech.customer.repository.CustomerAddressRepository;
import com.fintech.customer.repository.KycCaseRepository;
import com.fintech.customer.repository.KycDocumentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class KycOperationsService {

    private final KycCaseRepository kycCaseRepository;
    private final KycDocumentRepository kycDocumentRepository;
    private final CustomerAddressRepository customerAddressRepository;

    public List<KycApplicationDetailsResponse> getKycApplicationDetails(
            String status,
            String query
    ) {

        log.info(
                "Fetching KYC application details. Status: {}, Query: {}",
                status,
                query
        );

        // 1. Fetch KYC cases.
        List<KycCase> kycCases =
                kycCaseRepository.findAllByOrderByCreatedAtDesc();

        if (kycCases.isEmpty()) {
            return Collections.emptyList();
        }

        // 2. Fetch documents.
        List<KycDocument> documents =
                kycDocumentRepository.findAll();

        // 3. Collect customer profile IDs.
        List<UUID> customerIds = kycCases.stream()
                .map(KycCase::getCustomerProfile)
                .filter(Objects::nonNull)
                .map(CustomerProfile::getId)
                .distinct()
                .toList();

        // 4. Fetch address projections without entity getters.
        Map<UUID, List<CustomerAddressRepository.AddressDetails>>
                addressesByCustomer =
                customerAddressRepository
                        .findAddressDetailsByCustomerIds(customerIds)
                        .stream()
                        .collect(Collectors.groupingBy(
                                CustomerAddressRepository.AddressDetails
                                        ::getCustomerProfileId
                        ));

        // 5. Group documents by customer.
        Map<UUID, List<KycDocument>> documentsByCustomer =
                documents.stream()
                        .filter(d -> d.getCustomerProfile() != null)
                        .collect(Collectors.groupingBy(
                                d -> d.getCustomerProfile().getId()
                        ));

        // 6. Apply filters.
        String normalizedStatus =
                status == null || status.isBlank()
                        ? "ALL"
                        : status.trim().toUpperCase();

        String normalizedQuery =
                query == null
                        ? ""
                        : query.trim().toLowerCase();

        List<KycCase> filteredCases = kycCases.stream()
                .filter(kycCase ->
                        "ALL".equals(normalizedStatus)
                                || String.valueOf(kycCase.getStatus())
                                .equalsIgnoreCase(normalizedStatus)
                )
                .filter(kycCase -> {

                    if (normalizedQuery.isEmpty()) {
                        return true;
                    }

                    CustomerProfile customer =
                            kycCase.getCustomerProfile();

                    if (customer == null) {
                        return false;
                    }

                    return contains(customer.getFullName(), normalizedQuery)
                            || contains(customer.getCustomerId(), normalizedQuery)
                            || contains(customer.getPanMasked(), normalizedQuery)
                            || contains(customer.getEmailMasked(), normalizedQuery)
                            || contains(kycCase.getKycCaseId(), normalizedQuery);
                })
                .toList();

        // 7. Map entities to response DTOs.
        return filteredCases.stream()
                .filter(kycCase -> kycCase.getCustomerProfile() != null)
                .map(kycCase -> {

                    CustomerProfile customer =
                            kycCase.getCustomerProfile();

                    UUID customerId = customer.getId();

                    // Address details.
                    KycApplicationDetailsResponse.AddressDetails address =
                            addressesByCustomer
                                    .getOrDefault(customerId, Collections.emptyList())
                                    .stream()
                                    .findFirst()
                                    .map(a ->
                                            new KycApplicationDetailsResponse.AddressDetails(
                                                    a.getAddressType(),
                                                    a.getAddressLine1(),
                                                    a.getAddressLine2(),
                                                    a.getCity(),
                                                    a.getState(),
                                                    a.getPostalCode(),
                                                    a.getCountry()
                                            )
                                    )
                                    .orElse(null);

                    // Customer details.
                    KycApplicationDetailsResponse.CustomerDetails
                            customerDetails =
                            new KycApplicationDetailsResponse.CustomerDetails(
                                    customer.getCustomerId(),
                                    customer.getFullName(),
                                    customer.getEmailMasked(),
                                    customer.getMobileMasked(),
                                    customer.getPanMasked(),
                                    customer.getDateOfBirth(),
                                    address
                            );

                    // Documents associated with this customer and KYC case.
                    List<KycApplicationDetailsResponse.DocumentDetails>
                            documentDetails =
                            documentsByCustomer
                                    .getOrDefault(customerId, Collections.emptyList())
                                    .stream()
                                    .filter(document ->
                                            document.getKycCase() == null
                                                    || document.getKycCase().getId()
                                                    .equals(kycCase.getId())
                                    )
                                    .map(document ->
                                            new KycApplicationDetailsResponse.DocumentDetails(
                                                    document.getId(),
                                                    document.getDocumentReferenceId(),
                                                    String.valueOf(document.getDocumentType()),
                                                    document.getFileName(),
                                                    document.getContentType(),
                                                    document.getContentSizeBytes(),
                                                    document.getStatus(),
                                                    document.getUploadedAt()
                                            )
                                    )
                                    .toList();

                    return new KycApplicationDetailsResponse(
                            kycCase.getId(),
                            kycCase.getKycCaseId(),
                            customer.getCustomerId(),
                            customer.getFullName(),
                            String.valueOf(kycCase.getStatus()),
                            String.valueOf(kycCase.getRiskCategory()),
                            kycCase.getOccupation(),
                            kycCase.getAnnualIncomeRange(),
                            kycCase.getSubmittedAt(),
                            customerDetails,
                            documentDetails
                    );
                })
                .toList();
    }

    private boolean contains(String value, String query) {
        return value != null
                && value.toLowerCase().contains(query);
    }
}
