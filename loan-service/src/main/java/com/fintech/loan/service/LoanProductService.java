package com.fintech.loan.service;

import com.fintech.loan.dto.response.LoanProductListResponse;
import com.fintech.loan.dto.response.LoanProductResponse;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.repository.LoanProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class LoanProductService {

    private final LoanProductRepository loanProductRepository;

    public LoanProductService(LoanProductRepository loanProductRepository) {
        this.loanProductRepository = loanProductRepository;
    }

    public LoanProductListResponse getProducts(String loanType) {
        List<LoanProduct> products;
        if (loanType != null && !loanType.isBlank()) {
            products = loanProductRepository.findByLoanTypeAndActiveTrue(loanType.toUpperCase());
        } else {
            products = loanProductRepository.findByActiveTrue();
        }

        List<LoanProductResponse> responseList = products.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return new LoanProductListResponse(responseList);
    }

    private LoanProductResponse toResponse(LoanProduct product) {
        return new LoanProductResponse(
                product.getProductCode(),
                product.getProductName(),
                product.getLoanType(),
                product.getCurrency(),
                product.getMinAmount(),
                product.getMaxAmount(),
                product.getMinTenureMonths(),
                product.getMaxTenureMonths(),
                product.getInterestRateFrom(),
                product.getInterestType(),
                product.getSecured()
        );
    }
}
