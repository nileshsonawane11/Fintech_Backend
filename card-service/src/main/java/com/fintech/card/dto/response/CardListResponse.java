package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Wrapper container for a collection of customer payment cards")
public class CardListResponse {

    @Schema(description = "List of issued payment cards")
    private List<CardResponse> data;

    public CardListResponse() {}

    public CardListResponse(List<CardResponse> data) {
        this.data = data;
    }

    public List<CardResponse> getData() { return data; }
    public void setData(List<CardResponse> data) { this.data = data; }
}
