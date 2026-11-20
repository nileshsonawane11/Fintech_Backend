package com.fintech.card.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    public static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Value("${server.port:8086}")
    private String serverPort;

    @Bean
    public OpenAPI cardServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FinBank Card Service API")
                        .description("Production-grade microservice responsible for debit/credit card issuance, digital tokenization, card lifecycle operations, and security controls.")
                        .version("1.0.0")
                        .contact(new Contact().name("FinBank Cards Architecture").email("cards-architecture@finbank.example.com"))
                        .license(new License().name("Proprietary").url("https://finbank.example.com/license")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("API Gateway"),
                        new Server().url("/").description("Current Host Gateway Context"),
                        new Server().url("http://localhost:" + serverPort).description("Direct Card Service Instance")
                ))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter RSA RS256 Bearer access token issued by Identity Service")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
    }
}
