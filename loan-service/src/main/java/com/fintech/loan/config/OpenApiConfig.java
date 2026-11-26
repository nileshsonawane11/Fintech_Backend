package com.fintech.loan.config;

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

    @Value("${server.port:8087}")
    private String serverPort;

    @Bean
    public OpenAPI loanServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FinBank Loan Service API")
                        .description("Production-grade microservice for dynamic loan product catalog, promotional offers with versioned snapshots, KYC/Account-verified loan applications, underwriting lifecycle state machine, disbursement, and repayment schedules.")
                        .version("1.0.0")
                        .contact(new Contact().name("FinBank Architecture Team").email("architecture@finbank.example.com"))
                        .license(new License().name("Proprietary").url("https://finbank.example.com/license")))
                .servers(List.of(
                        new Server().url("/").description("Current Host Gateway Context"),
                        new Server().url("http://localhost:" + serverPort).description("Direct Loan Service Instance")
                ))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .name("BearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter RSA RS256 Bearer access token issued by Identity Service")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }
}
