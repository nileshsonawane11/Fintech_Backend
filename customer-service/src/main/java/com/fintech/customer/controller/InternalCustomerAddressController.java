package com.fintech.customer.controller;

import com.fintech.customer.dto.response.InternalAddressResponse;
import com.fintech.customer.exception.ApiException;
import com.fintech.customer.model.CustomerAddress;
import com.fintech.customer.repository.CustomerAddressRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/internal/api/v1/addresses")
@Tag(name = "Internal Address Verification", description = "Internal service APIs for inter-service address validation and delivery verification")
public class InternalCustomerAddressController {

    private final CustomerAddressRepository customerAddressRepository;

    public InternalCustomerAddressController(CustomerAddressRepository customerAddressRepository) {
        this.customerAddressRepository = customerAddressRepository;
    }

    @GetMapping("/{addressId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Get Address Verification Info (Internal)",
            description = "Retrieves customer ownership, delivery eligibility, and active status for an address ID")
    public ResponseEntity<InternalAddressResponse> getAddressById(@PathVariable String addressId) {
        UUID uuid;
        try {
            uuid = UUID.fromString(addressId);
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ADDRESS_NOT_FOUND", "Invalid or unknown address identifier: " + addressId);
        }

        CustomerAddress address = customerAddressRepository.findById(uuid)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ADDRESS_NOT_FOUND", "Delivery address not found: " + addressId));

        InternalAddressResponse response = new InternalAddressResponse(
                address.getId(),
                address.getCustomerProfile().getCustomerId(),
                address.getCustomerProfile().getIdentitySubject(),
                address.getAddressType(),
                address.getAddressLine1(),
                address.getAddressLine2(),
                address.getCity(),
                address.getState(),
                address.getPostalCode(),
                address.getCountry(),
                address.getStatus(),
                address.isDeliverable(),
                address.getCreatedAt()
        );

        return ResponseEntity.ok(response);
    }
}
