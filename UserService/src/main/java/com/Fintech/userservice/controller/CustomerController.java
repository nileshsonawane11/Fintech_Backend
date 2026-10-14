package com.Fintech.userservice.controller;

import com.Fintech.userservice.dto.CustomerServiceResponse;
import com.Fintech.userservice.dto.UserServiceRequest;
import com.Fintech.userservice.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class CustomerController {

    private final CustomerService cutomerService;

    public CustomerController(CustomerService cutomerService) {
        this.cutomerService = cutomerService;
    }

    @PostMapping("/register")
    public ResponseEntity<CustomerServiceResponse> register(
            @Valid @RequestBody UserServiceRequest userServiceRequest
    ){
        CustomerServiceResponse customerServiceResponse =  cutomerService.register(userServiceRequest);

        return new ResponseEntity<>(customerServiceResponse, HttpStatus.CREATED);
    }
}
