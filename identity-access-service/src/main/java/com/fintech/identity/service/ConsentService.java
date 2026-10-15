package com.fintech.identity.service;

import com.fintech.identity.dto.request.CreateConsentRequest;
import com.fintech.identity.dto.response.ConsentResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.Consent;
import com.fintech.identity.model.Customer;
import com.fintech.identity.repository.ConsentRepository;
import com.fintech.identity.repository.CustomerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ConsentService {

    private final ConsentRepository consentRepository;
    private final CustomerRepository customerRepository;

    public ConsentService(
            ConsentRepository consentRepository,
            CustomerRepository customerRepository
    ) {
        this.consentRepository = consentRepository;
        this.customerRepository = customerRepository;
    }

    public ConsentResponse create(
            UUID customerId,
            CreateConsentRequest request
    ) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "CUSTOMER_NOT_FOUND",
                        "Customer was not found."
                ));

        Consent consent = new Consent(
                customer,
                request.purpose(),
                request.consentTextVersion().trim()
        );

        Consent saved = consentRepository.save(consent);

        return new ConsentResponse(
                saved.getId(),
                saved.getPurpose().name(),
                "GRANTED",
                saved.getGrantedAt()
        );
    }

    public List<ConsentResponse> findAll(UUID customerId) {
        if (!customerRepository.existsById(customerId)) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "CUSTOMER_NOT_FOUND",
                    "Customer was not found."
            );
        }

        return consentRepository
                .findAllByCustomerIdOrderByGrantedAtDesc(customerId)
                .stream()
                .map(consent -> new ConsentResponse(
                        consent.getId(),
                        consent.getPurpose().name(),
                        "GRANTED",
                        consent.getGrantedAt()
                ))
                .toList();
    }
}