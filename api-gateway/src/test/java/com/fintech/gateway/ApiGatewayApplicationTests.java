package com.fintech.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false"
})
class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
        // Verifies that the gateway application starts.
    }
}
