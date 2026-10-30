package com.fintech.card.dto.response;

import java.util.List;

public class CardListResponse {
    private List<CardResponse> data;

    public CardListResponse() {}

    public CardListResponse(List<CardResponse> data) {
        this.data = data;
    }

    public List<CardResponse> getData() { return data; }
    public void setData(List<CardResponse> data) { this.data = data; }
}
