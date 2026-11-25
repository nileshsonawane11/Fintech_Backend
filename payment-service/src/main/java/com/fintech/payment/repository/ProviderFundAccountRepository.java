package com.fintech.payment.repository;

import com.fintech.payment.entity.ProviderFundAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProviderFundAccountRepository extends JpaRepository<ProviderFundAccount, String> {

    Optional<ProviderFundAccount> findByProviderNameAndBeneficiaryId(String providerName, String beneficiaryId);

    Optional<ProviderFundAccount> findByProviderFundAccountId(String providerFundAccountId);
}
