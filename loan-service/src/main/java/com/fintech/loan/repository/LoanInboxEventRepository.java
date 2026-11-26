package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanInboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoanInboxEventRepository extends JpaRepository<LoanInboxEvent, String> {
}
