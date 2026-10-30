package com.fintech.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class GatewayFallbackController {

    @RequestMapping("/identity")
    public Mono<ResponseEntity<Map<String, Object>>> identityFallback(
            ServerWebExchange exchange) {

        return unavailable("Identity Service", exchange);
    }

    @RequestMapping("/customer")
    public Mono<ResponseEntity<Map<String, Object>>> customerFallback(
            ServerWebExchange exchange) {

        return unavailable("Customer Service", exchange);
    }

    private Mono<ResponseEntity<Map<String, Object>>> unavailable(
            String service,
            ServerWebExchange exchange) {

        Map<String, Object> body = Map.of(
                "title", "Service temporarily unavailable",
                "status", 503,
                "code", "DOWNSTREAM_SERVICE_UNAVAILABLE",
                "detail", service + " is temporarily unavailable.",
                "path", exchange.getRequest().getURI().getPath()
        );

        return Mono.just(
                ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(body)
        );
    }
}