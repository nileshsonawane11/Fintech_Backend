package com.Fintech.userservice.service;

import com.Fintech.userservice.config.PasswordConfig;
import com.Fintech.userservice.dto.CustomerServiceResponse;
import com.Fintech.userservice.dto.UserServiceRequest;
import com.Fintech.userservice.exception.RequestConflictException;
import com.Fintech.userservice.model.Customer;
import com.Fintech.userservice.repository.CustomerRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;

@Service
public class CustomerService {
    private final PasswordEncoder passwordEncoder;
    private final CustomerRepository customerRepository;

    public CustomerService(PasswordEncoder passwordEncoder, CustomerRepository customerRepository) {
        this.passwordEncoder = passwordEncoder;
        this.customerRepository = customerRepository;
    }

    public CustomerServiceResponse register(UserServiceRequest userServiceRequest){

        String mobileNumber = userServiceRequest.mobileNumber().trim();
        String email = userServiceRequest.email().toLowerCase(Locale.ROOT).trim();

        if (customerRepository.existsByMobileNumber(mobileNumber)) {
            throw new RequestConflictException(
                    "MOBILE_ALREADY_REGISTERED",
                    "This mobile number is already registered."
            );
        }

        if (customerRepository.existsByEmail(email)) {
            throw new RequestConflictException(
                    "EMAIL_ALREADY_REGISTERED",
                    "This email address is already registered."
            );
        }

        String passwordHashed = passwordEncoder.encode(userServiceRequest.password());

        Customer customer = new Customer(
                mobileNumber,
                email,
                passwordHashed,
                userServiceRequest.acceptedTermsVersion(),
                userServiceRequest.marketingConsent()
        );

        customerRepository.save(customer);

        return new CustomerServiceResponse(
                customer.getUserId(),
                userServiceRequest.email(),
                userServiceRequest.mobileNumber()
        );
    }
}
