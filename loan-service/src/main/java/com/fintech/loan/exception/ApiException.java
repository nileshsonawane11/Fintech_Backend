package com.fintech.loan.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus httpStatus;

    public ApiException(String code, String message, HttpStatus httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public ApiException(HttpStatus httpStatus, String code, String message) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    public static ApiException forbidden(String code, String message) {
        return new ApiException(HttpStatus.FORBIDDEN, code, message);
    }

    public static ApiException unprocessable(String code, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
    }

    public static ApiException serviceUnavailable(String code, String message) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, code, message);
    }
}
