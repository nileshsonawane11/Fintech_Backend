package com.fintech.account.client;

import com.fintech.account.exception.AccountException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Component
public class IdentityServiceClient {

    private static final Logger log = LoggerFactory.getLogger(IdentityServiceClient.class);

    private final RestClient restClient;

    public IdentityServiceClient(@Value("${app.services.identity-service.url:http://localhost:8081}") String identityServiceUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(identityServiceUrl)
                .build();
    }

    public IdentityMatchResponse matchIdentity(String mobileNumber, String email) {
        log.info("Querying Identity Service for credential match");

        try {
            return restClient.post()
                    .uri("/api/v1/auth/identities/match")
                    .body(new IdentityMatchRequest(mobileNumber, email))
                    .retrieve()
                    .onStatus(status -> status.value() == 409, (req, res) -> {
                        log.warn("Identity Service reported credential conflict: mobile and email belong to different identities");
                        throw AccountException.conflict(
                                "IDENTITY_CONFLICT",
                                "The submitted mobile number and email address belong to different customer accounts."
                        );
                    })
                    .body(IdentityMatchResponse.class);
        } catch (AccountException ae) {
            throw ae;
        } catch (HttpClientErrorException.Conflict conflictEx) {
            log.warn("Identity Service returned 409 Conflict");
            throw AccountException.conflict(
                    "IDENTITY_CONFLICT",
                    "The submitted mobile number and email address belong to different customer accounts."
            );
        } catch (Exception ex) {
            log.error("Failed to communicate with Identity Service: {}", ex.getMessage());
            throw AccountException.serviceUnavailable("Identity Service is currently unavailable for applicant matching.");
        }
    }

    public IdentityMatchResponse createApplicantIdentity(String fullName, String mobileNumber, String email) {
        log.info("Creating applicant identity in Identity Service");

        try {
            return restClient.post()
                    .uri("/api/v1/auth/identities/applicant")
                    .body(new ApplicantIdentityRequest(fullName, mobileNumber, email))
                    .retrieve()
                    .onStatus(status -> status.value() == 409, (req, res) -> {
                        log.warn("Identity Service reported conflict during applicant creation; attempting rematch");
                    })
                    .body(IdentityMatchResponse.class);
        } catch (AccountException ae) {
            throw ae;
        } catch (Exception ex) {
            log.warn("Applicant identity creation failed: {}. Attempting match recovery.", ex.getMessage());
            try {
                IdentityMatchResponse recoveryMatch = matchIdentity(mobileNumber, email);
                if (recoveryMatch != null && recoveryMatch.matched()) {
                    return recoveryMatch;
                }
            } catch (Exception ignored) {}
            throw AccountException.serviceUnavailable("Identity Service is currently unavailable to register applicant identity.");
        }
    }
}
