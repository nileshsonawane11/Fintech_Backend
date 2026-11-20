package com.fintech.gateway.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    public static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI gatewayOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FinBank Centralized API Gateway")
                        .description("Centralized API Gateway and Swagger UI hub routing to all FinBank microservices.")
                        .version("1.0.0")
                        .contact(new Contact().name("FinBank Architecture Team").email("architecture@finbank.example.com"))
                        .license(new License().name("Proprietary").url("https://finbank.example.com/license")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("API Gateway Hub"),
                        new Server().url("/").description("Current Host Gateway Context")
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
