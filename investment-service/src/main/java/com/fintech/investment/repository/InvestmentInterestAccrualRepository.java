package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentInterestAccrual;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvestmentInterestAccrualRepository extends JpaRepository<InvestmentInterestAccrual, UUID> {
    List<InvestmentInterestAccrual> findByInvestmentIdOrderByAccrualDateDesc(String investmentId);
}
