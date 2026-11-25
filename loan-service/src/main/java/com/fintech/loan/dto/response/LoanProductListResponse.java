package com.fintech.loan.dto.response;

import java.util.List;

public class LoanProductListResponse {

    private List<LoanProductResponse> data;

    public LoanProductListResponse() {}

    public LoanProductListResponse(List<LoanProductResponse> data) {
        this.data = data;
    }

    public List<LoanProductResponse> getData() { return data; }
    public void setData(List<LoanProductResponse> data) { this.data = data; }
}
