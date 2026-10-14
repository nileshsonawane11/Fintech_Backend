package com.Fintech.userservice.exception;

public class RequestConflictException extends RuntimeException {

    private final String field;

    public RequestConflictException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}