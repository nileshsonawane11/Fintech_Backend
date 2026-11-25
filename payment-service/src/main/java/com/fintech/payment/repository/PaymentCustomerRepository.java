package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentCustomer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentCustomerRepository extends JpaRepository<PaymentCustomer, String> {

    Optional<PaymentCustomer> findByUserId(String userId);

    Optional<PaymentCustomer> findByCustomerId(String customerId);

    Optional<PaymentCustomer> findByRazorpayCustomerId(String razorpayCustomerId);
}
