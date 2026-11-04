package com.fintech.account.exception;

import org.springframework.http.HttpStatus;

public class AccountException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AccountException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public static AccountException notFound(String message) {
        return new AccountException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", message);
    }

    public static AccountException conflict(String code, String message) {
        return new AccountException(HttpStatus.CONFLICT, code, message);
    }

    public static AccountException unprocessable(String code, String message) {
        return new AccountException(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
    }

    public static AccountException forbidden(String code, String message) {
        return new AccountException(HttpStatus.FORBIDDEN, code, message);
    }

    public static AccountException unauthorized(String message) {
        return new AccountException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    public static AccountException badRequest(String message) {
        return new AccountException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message);
    }

    public static AccountException serviceUnavailable(String message) {
        return new AccountException(HttpStatus.SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE", message);
    }
}
