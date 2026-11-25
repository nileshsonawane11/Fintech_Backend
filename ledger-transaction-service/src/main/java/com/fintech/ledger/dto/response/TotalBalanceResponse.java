package com.fintech.ledger.dto.response;

import java.math.BigDecimal;

public record TotalBalanceResponse(
        BigDecimal Totalbalance,
        Integer TotalAccounts
){}
