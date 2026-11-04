# FinBank – Account Service (`account-service`)

Production-grade Spring Boot microservice responsible for account product catalog management, customer account application workflows, bank account lifecycle operations, account holds, nominee assignments, and financial domain event publishing for the **FinBank** banking application.

---

## 1. Service Overview & Responsibilities

The **Account Service** (`ACCOUNT-SERVICE`) owns the core bank account domain within FinBank:
- **Account Product Catalog**: Management and cursor-paged catalog listing of banking products (`SAVINGS`, `CURRENT`, etc.) with eligibility criteria, interest rates, and transfer limits.
- **Customer Account Applications**: Application submission, validation against customer KYC approval status, duplicate application checks, and automated estimated completion time calculation.
- **Operations Application Processing**: Operations staff review, approval (with automatic account creation), and rejection (with reason logging and event notifications).
- **Account Lifecycle Management**: Bank account status transitions (`PENDING_ACTIVATION`, `ACTIVE`, `FROZEN`, `BLOCKED`, `DORMANT`, `CLOSED`) with state transition validation, strict closure validation (ensuring zero balance and no active holds), and audit history tracking.
- **Account Holds & Reserves**: Creation, release, and cancellation of balance holds for dispute, judicial, or operational reasons with aggregate hold calculations.
- **Nominee Management**: Allocation and management of account nominees with strict cumulative allocation percentage limits (up to 100%) and AES-256 GCM encrypted mobile storage at rest.
- **Financial Balance Integration**: Resilient integration with Ledger Service to report ledger, available, and hold balance breakdowns.
- **Transactional Outbox Event Publishing**: Reliable, idempotent publishing of 15 distinct domain events across 4 partitioned Kafka topics without distributed transaction overhead.
- **Idempotency Engine**: Cryptographic payload hashing (`SHA-256`) and database persistence of idempotency keys to guarantee at-most-once execution of critical state mutations.

---

## 2. Technology Stack & Versions

| Layer | Component | Version / Specification |
|---|---|---|
| **Language** | Java | 21 (LTS) / 25 |
| **Framework** | Spring Boot | 4.0.7 |
| **Cloud / Discovery** | Netflix Eureka Client | Spring Cloud 2025.1.2 |
| **Persistence** | Spring Data JPA / Hibernate | PostgreSQL 16 Dialect |
| **Migrations** | Flyway Core & Flyway PostgreSQL | Schema versioning (`V1`, `V2`) |
| **Security** | Spring Security & OAuth2 Resource Server | RSA RS256 JWT, Role & Permission extraction |
| **Messaging** | Spring Kafka / Apache Kafka | Outbox pattern producer & consumer |
| **API Docs** | Springdoc OpenAPI UI | 2.8.14 (`/swagger-ui.html`, `/v3/api-docs`) |
| **Validation** | Jakarta Bean Validation | `@NotNull`, `@Min`, `@Pattern`, `@Valid` |
| **Encryption** | Java Cryptography Extension (JCE) | AES-256 GCM authenticated encryption |
| **Testing** | JUnit 5, Mockito 5, AssertJ | Subclass MockMaker, non-attaching bytecode |

---

## 3. Architecture & Multi-Module Integration

The `account-service` is an integral module of the FinBank Maven reactor:
```
Fintech_Microservices (Parent POM)
 ├── api-gateway (Port 8080)
 ├── service-discovery (Eureka, Port 8761)
 ├── identity-access-service (Port 8081)
 ├── account-service (Port 8082) [THIS SERVICE]
 ├── customer-service (Port 8084)
 ├── payment-service (Port 8085)
 └── frontend (Port 3000)
```

### Gateway Routing Architecture
All client and back-office traffic passes through the `api-gateway`:
- Customer APIs: `http://localhost:8080/api/v1/accounts/**`, `http://localhost:8080/api/v1/account-products/**`
- Operations APIs: `http://localhost:8080/ops/api/v1/accounts/**`, `http://localhost:8080/ops/api/v1/account-products/**`, `http://localhost:8080/ops/api/v1/account-applications/**`, `http://localhost:8080/ops/api/v1/holds/**`
- Direct Service Port: `http://localhost:8082`

---

## 4. Package Structure & Code Guide

```
com.fintech.account
├── config/                  # Kafka, Security, OpenAPI, Filter configs
├── controller/              # Customer & Ops REST Controllers
├── client/                  # Feign/WebClient integrations (Customer, Ledger)
├── dto/
│   ├── request/             # Request payload records with Jakarta validation
│   └── response/            # Immutable response records (masked account numbers)
├── entity/                  # JPA Entities (Optimistic locking, Auditing)
├── enums/                   # AccountType, AccountStatus, HoldStatus, etc.
├── event/
│   ├── consumer/            # Kafka event listeners
│   ├── model/               # 15 Domain event models & metadata
│   └── producer/            # Transactional Outbox publisher & scheduler
├── exception/               # GlobalExceptionHandler & AccountException
├── idempotency/             # IdempotencyRecord entity & repository
├── mapper/                  # Domain-to-DTO entity mappers
├── repository/              # Spring Data JPA Repositories with cursor queries
├── security/                # JwtAuthenticationConverter, SecurityConfig, SecurityUtils
├── service/                 # Business logic interfaces & implementations
└── util/                    # EncryptionUtil (AES-GCM), CorrelationIdFilter, AuditLogger
```

---

## 5. Dedicated Database Configuration

Account Service strictly isolates its data in PostgreSQL database `fintech_account`.

### Core Database Tables
1. **`account_products`**: Bank product offerings with balance limits, interest rates, age thresholds, and active toggles.
2. **`account_applications`**: Applications submitted by customers with state machine transitions (`SUBMITTED` -> `PENDING_APPROVAL` -> `APPROVED`/`REJECTED` -> `ACCOUNT_CREATED`).
3. **`accounts`**: Production bank accounts containing public IDs (`ACC-XXXXXXXX`), secure internal account numbers (`FINB-XXXXXXXXXXXX`), customer references, and lifecycle statuses.
4. **`account_holds`**: Explicit balance holds (`ACTIVE`, `RELEASED`, `CANCELLED`) with reason codes and operator identifiers.
5. **`account_nominees`**: Nominee beneficiaries with allocation percentages (max 100% aggregate) and AES-256 GCM encrypted mobile numbers.
6. **`idempotency_records`**: Cryptographic request hash records with cached responses and expiration timestamps.
7. **`outbox_events`**: Transactional outbox table for at-least-once Kafka publication with exponential backoff retries.
8. **`account_lifecycle_history`**: Audit trail of all account status transitions (`status_from`, `status_to`, `reason`, `changed_by`).

---

## 6. Environment Variables & Default Configuration

Default configuration in `src/main/resources/application.yml`:

```yaml
server:
  port: ${PORT:8082}

spring:
  application:
    name: ACCOUNT-SERVICE
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/fintech_account}
    username: ${SPRING_DATASOURCE_USERNAME:postgres}
    password: ${SPRING_DATASOURCE_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: false
        jdbc.time_zone: UTC
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}

app:
  security:
    public-key-path: ${PUBLIC_KEY_PATH:classpath:keys/public.pem}
    encryption-key: ${ENCRYPTION_KEY:0123456789abcdef0123456789abcdef} # 256-bit AES key
  kafka:
    topics:
      application-events: ${KAFKA_TOPIC_APPLICATION_EVENTS:account.application-events.v1}
      lifecycle-events: ${KAFKA_TOPIC_LIFECYCLE_EVENTS:account.lifecycle-events.v1}
      hold-events: ${KAFKA_TOPIC_HOLD_EVENTS:account.hold-events.v1}
      nominee-events: ${KAFKA_TOPIC_NOMINEE_EVENTS:account.nominee-events.v1}
```

---

## 7. Flyway Migrations

Migrations are located in `src/main/resources/db/migration`:
- **`V1__create_account_schema.sql`**: Complete DDL creating 8 tables, foreign keys, check constraints, composite indexes, and optimistic lock version columns.
- **`V2__seed_initial_products.sql`**: Seeds default products:
  - `SAVINGS_REGULAR`: ₹10,000 min balance, ₹5,000 initial funding, 3.50% interest rate, 18+ min age.
  - `SAVINGS_PREMIUM`: ₹25,000 min balance, ₹10,000 initial funding, 4.00% interest rate, 18+ min age.
  - `CURRENT_STANDARD`: ₹50,000 min balance, ₹25,000 initial funding, 0.00% interest rate, 18+ min age.

---

## 8. Kafka Topics & 15 Domain Events

Domain events are written atomically to `outbox_events` within the application transaction and published to Kafka via `OutboxPublisherTask`:

| Kafka Topic | Event Type | Description |
|---|---|---|
| `account.application-events.v1` | `AccountApplicationSubmittedEvent` | Customer submitted application |
| `account.application-events.v1` | `AccountApplicationUnderReviewEvent`| Application moved to review |
| `account.application-events.v1` | `AccountApplicationApprovedEvent`   | Application approved by Ops |
| `account.application-events.v1` | `AccountApplicationRejectedEvent`   | Application rejected by Ops |
| `account.application-events.v1` | `AccountApplicationCancelledEvent`  | Application cancelled |
| `account.lifecycle-events.v1`   | `AccountCreatedEvent`               | Account provisioned |
| `account.lifecycle-events.v1`   | `AccountActivatedEvent`             | Account activated |
| `account.lifecycle-events.v1`   | `AccountFrozenEvent`                | Account frozen |
| `account.lifecycle-events.v1`   | `AccountUnfrozenEvent`              | Account un-frozen |
| `account.lifecycle-events.v1`   | `AccountBlockedEvent`               | Account blocked |
| `account.lifecycle-events.v1`   | `AccountClosedEvent`                | Account closed |
| `account.hold-events.v1`        | `AccountHoldCreatedEvent`           | Balance hold applied |
| `account.hold-events.v1`        | `AccountHoldReleasedEvent`          | Balance hold released |
| `account.hold-events.v1`        | `AccountHoldCancelledEvent`         | Balance hold cancelled |
| `account.nominee-events.v1`     | `AccountNomineeAddedEvent`          | Nominee registered |

*Security Rule: Plaintext account numbers are never published in Kafka events; payloads use public `accountId` or masked account numbers.*

---

## 9. Inter-Service Communication

1. **Customer & KYC Service (`CUSTOMER-SERVICE`)**:
   - `GET http://CUSTOMER-SERVICE/api/v1/customers/{customerId}`
   - Verifies customer exists and checks `kycStatus == "APPROVED"`.
   - Blocks application submission if KYC is pending, rejected, or missing.
2. **Ledger Service (`LEDGER-SERVICE`)**:
   - `GET http://LEDGER-SERVICE/api/v1/accounts/{accountId}/balance`
   - Retrieves live ledger balance.
   - Combined with local active holds to compute available spendable balance.
   - Enforces zero balance check before permitting account closure.

---

## 10. Security, Roles & Permissions

Security uses RS256 JWT tokens issued by `IDENTITY-SERVICE`. The public RSA key (`public.pem`) verifies token signatures locally.

### Role & Permission Matrix
- **`CUSTOMER`** (Self-service):
  - Permissions: `ACCOUNT_PRODUCT_READ`, `ACCOUNT_APPLY`, `ACCOUNT_VIEW`, `ACCOUNT_NOMINEE_MANAGE`
  - Enforces data ownership: A customer can only access accounts and applications matching their authenticated `sub` (Subject UUID).
- **`OPERATIONS`** (Back-office processing):
  - Permissions: `ACCOUNT_APPLICATION_REVIEW`, `ACCOUNT_APPLICATION_APPROVE`, `ACCOUNT_APPLICATION_REJECT`, `ACCOUNT_FREEZE`, `ACCOUNT_UNFREEZE`, `ACCOUNT_HOLD_CREATE`, `ACCOUNT_HOLD_RELEASE`
- **`MANAGER`** (Management):
  - Permissions: Includes all Operations permissions plus `ACCOUNT_BLOCK`, `ACCOUNT_CLOSE`.
- **`ADMIN`** (System administration):
  - Permissions: Includes all Manager permissions plus `ACCOUNT_PRODUCT_CREATE`, `ACCOUNT_PRODUCT_UPDATE`, `ACCOUNT_PRODUCT_DEACTIVATE`.

---

## 11. REST API Endpoints

### 11.1 Customer APIs (`/api/v1/**`)
| Method | Route | Description | Required Permission |
|---|---|---|---|
| `GET` | `/api/v1/account-products` | List active products (cursor paged) | Public / `ACCOUNT_PRODUCT_READ` |
| `GET` | `/api/v1/account-products/{productCode}` | Get product details | Public / `ACCOUNT_PRODUCT_READ` |
| `POST` | `/api/v1/accounts` | Apply for new account (`Idempotency-Key`) | `ACCOUNT_APPLY` |
| `GET` | `/api/v1/accounts/applications` | List customer applications | `ACCOUNT_VIEW` |
| `GET` | `/api/v1/accounts/applications/{applicationId}` | Get application status | `ACCOUNT_VIEW` |
| `GET` | `/api/v1/accounts` | List customer bank accounts | `ACCOUNT_VIEW` |
| `GET` | `/api/v1/accounts/{accountId}` | Get bank account details & balances | `ACCOUNT_VIEW` |
| `POST` | `/api/v1/accounts/{accountId}/nominees` | Add nominee (max 100% total) | `ACCOUNT_NOMINEE_MANAGE` |
| `GET` | `/api/v1/accounts/{accountId}/nominees` | List account nominees (masked) | `ACCOUNT_VIEW` |

### 11.2 Operations & Admin APIs (`/ops/api/v1/**`)
| Method | Route | Description | Required Permission |
|---|---|---|---|
| `POST` | `/ops/api/v1/account-products` | Create account product | `ACCOUNT_PRODUCT_CREATE` |
| `PUT` | `/ops/api/v1/account-products/{productCode}` | Update account product | `ACCOUNT_PRODUCT_UPDATE` |
| `PATCH`| `/ops/api/v1/account-products/{productCode}/status` | Activate/Deactivate product | `ACCOUNT_PRODUCT_DEACTIVATE` |
| `GET` | `/ops/api/v1/account-applications` | List applications by status/search | `ACCOUNT_APPLICATION_REVIEW` |
| `GET` | `/ops/api/v1/account-applications/{applicationId}` | Application review details | `ACCOUNT_APPLICATION_REVIEW` |
| `POST` | `/ops/api/v1/account-applications/{applicationId}/approve` | Approve application & create account | `ACCOUNT_APPLICATION_APPROVE` |
| `POST` | `/ops/api/v1/account-applications/{applicationId}/reject` | Reject application with reason | `ACCOUNT_APPLICATION_REJECT` |
| `GET` | `/ops/api/v1/accounts` | Search & list bank accounts | `ACCOUNT_VIEW` |
| `POST` | `/ops/api/v1/accounts/{accountId}/freeze` | Freeze account | `ACCOUNT_FREEZE` |
| `POST` | `/ops/api/v1/accounts/{accountId}/unfreeze` | Unfreeze account | `ACCOUNT_UNFREEZE` |
| `POST` | `/ops/api/v1/accounts/{accountId}/block` | Block account | `ACCOUNT_BLOCK` |
| `POST` | `/ops/api/v1/accounts/{accountId}/close` | Close account (zero balance check) | `ACCOUNT_CLOSE` |
| `GET` | `/ops/api/v1/accounts/{accountId}/history` | Lifecycle audit trail | `ACCOUNT_VIEW` |
| `POST` | `/ops/api/v1/accounts/{accountId}/holds` | Place balance hold | `ACCOUNT_HOLD_CREATE` |
| `GET` | `/ops/api/v1/accounts/{accountId}/holds` | List account holds | `ACCOUNT_VIEW` |
| `POST` | `/ops/api/v1/holds/{holdId}/release` | Release balance hold | `ACCOUNT_HOLD_RELEASE` |
| `POST` | `/ops/api/v1/holds/{holdId}/cancel` | Cancel balance hold | `ACCOUNT_HOLD_RELEASE` |

---

## 12. Request & Response Examples

### Example 1: Customer Account Application
**Request:**
`POST /api/v1/accounts`
```http
Authorization: Bearer <JWT>
Idempotency-Key: e82e213d-83b5-4b47-b873-1f19dcfb3bf3
Content-Type: application/json

{
  "productCode": "SAVINGS_REGULAR",
  "initialFundingAmount": 25000.00,
  "currency": "INR"
}
```
**Response: `201 Created`**
```json
{
  "accountApplicationId": "ACC-APP-20261102-1049",
  "customerId": "CUS-100234",
  "productCode": "SAVINGS_REGULAR",
  "status": "PENDING_APPROVAL",
  "submittedAt": "2026-11-02T13:00:00Z",
  "estimatedCompletionTime": "2026-11-03T13:00:00Z"
}
```

### Example 2: Operations Application Approval
**Request:**
`POST /ops/api/v1/account-applications/ACC-APP-20261102-1049/approve`
```http
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "remarks": "Identity and KYC verified against official document records."
}
```
**Response: `200 OK`**
```json
{
  "applicationId": "ACC-APP-20261102-1049",
  "status": "APPROVED",
  "approvedAt": "2026-11-02T13:10:00Z",
  "processedBy": "ops-user-456",
  "createdAccount": {
    "accountId": "ACC-50921847",
    "maskedAccountNumber": "FINB-********4819",
    "accountType": "SAVINGS",
    "accountStatus": "ACTIVE",
    "currency": "INR",
    "openedAt": "2026-11-02T13:10:00Z"
  }
}
```

### Example 3: Customer Account Details
**Request:**
`GET /api/v1/accounts/ACC-50921847`
```http
Authorization: Bearer <JWT>
```
**Response: `200 OK`**
```json
{
  "accountId": "ACC-50921847",
  "maskedAccountNumber": "FINB-********4819",
  "customerId": "CUS-100234",
  "productCode": "SAVINGS_REGULAR",
  "productName": "Regular Savings Account",
  "accountType": "SAVINGS",
  "currency": "INR",
  "accountStatus": "ACTIVE",
  "openedAt": "2026-11-02T13:10:00Z",
  "closedAt": null,
  "balances": {
    "ledgerBalance": 25000.00,
    "availableBalance": 20000.00,
    "holdBalance": 5000.00,
    "currency": "INR",
    "asOf": "2026-11-02T13:15:00Z"
  }
}
```

---

## 13. Error Handling Taxonomy

Standard RFC 7807 compatible JSON structure returned for all errors:
```json
{
  "code": "ACTIVE_HOLDS_EXIST",
  "message": "Cannot close account ACC-50921847 because active holds exist. Amount held: 5000.00 INR",
  "status": 422,
  "timestamp": "2026-11-02T13:15:00Z",
  "correlationId": "cor-9872134"
}
```

### Common Error Codes
| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `VALIDATION_FAILED` | Request payload fails bean validation constraints |
| `401 Unauthorized`| `UNAUTHORIZED` | Expired or invalid Bearer JWT |
| `403 Forbidden`   | `ACCESS_DENIED` | Missing required role/permission or accessing other customer's account |
| `403 Forbidden`   | `KYC_NOT_APPROVED` | Account application rejected because customer KYC is not approved |
| `404 Not Found`   | `PRODUCT_NOT_FOUND` | Product code does not exist |
| `404 Not Found`   | `APPLICATION_NOT_FOUND` | Application ID does not exist |
| `404 Not Found`   | `ACCOUNT_NOT_FOUND` | Bank account ID does not exist |
| `409 Conflict`    | `IDEMPOTENCY_CONFLICT` | Same idempotency key reused with different payload |
| `409 Conflict`    | `DUPLICATE_APPLICATION` | Active application already exists for this customer and product |
| `422 Unprocessable`| `INVALID_STATE_TRANSITION` | Disallowed status change (e.g. `CLOSED` to `ACTIVE`) |
| `422 Unprocessable`| `NON_ZERO_BALANCE` | Cannot close account with non-zero balance |
| `422 Unprocessable`| `ACTIVE_HOLDS_EXIST` | Cannot close account with active holds |
| `422 Unprocessable`| `ALLOCATION_EXCEEDED` | Total nominee allocation percentage exceeds 100% |

---

## 14. How to Run Locally

### Prerequisites
- Java 21+ JDK
- PostgreSQL running on port `5432` with database `fintech_account`
- Apache Kafka running on port `9092`
- Service Discovery (Eureka) running on port `8761`

### Step 1: Create Database
```bash
psql -U postgres -c "CREATE DATABASE fintech_account;"
```

### Step 2: Start Discovery & Gateway
```bash
# In terminal 1 (Eureka):
mvn spring-boot:run -pl service-discovery

# In terminal 2 (Gateway):
mvn spring-boot:run -pl api-gateway
```

### Step 3: Run Account Service
```bash
mvn spring-boot:run -pl account-service
```
Flyway automatically migrates the database schema (`V1`) and seeds default products (`V2`). The service registers with Eureka as `ACCOUNT-SERVICE` on port `8082`.

---

## 15. Swagger UI & API Documentation

- **Direct Swagger UI**: `http://localhost:8082/swagger-ui.html`
- **Via API Gateway**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI 3.0 JSON**: `http://localhost:8082/v3/api-docs`

---

## 16. How to Run Tests

Execute the unit and scenario test suite:
```bash
mvn test -pl account-service
```

### Included Test Suites
1. **`AccountProductServiceTest`**: Product catalog listing with cursor pagination, product creation, updates, and deactivation.
2. **`AccountApplicationServiceTest`**: Customer application submission, KYC status validation, operations approval, and operations rejection.
3. **`AccountServiceTest`**: Customer account listing, single account detail fetching, and ledger balance integration.
4. **`AccountLifecycleServiceTest`**: State machine validation (`PENDING` -> `ACTIVE` -> `FROZEN` -> `BLOCKED` -> `CLOSED`), non-zero balance rejection, active hold rejection, and lifecycle audit history.
5. **`AccountHoldServiceTest`**: Hold creation, aggregate hold sum calculation, hold release, and hold cancellation.
6. **`NomineeServiceTest`**: Nominee registration with AES-256 GCM encrypted mobile number, masking validation, and cumulative percentage validation (> 100% rejection).
7. **`IdempotencyServiceTest`**: SHA-256 request hashing, cached response return on key match, conflict on payload mutation, and in-flight request locking.
8. **`AccountControllersTest`**: Full REST API contract verification across all customer and ops endpoints.
9. **`SecurityAndBusinessScenariosTest`**: Exhaustive execution of all 9 business validation scenarios.
10. **`JwtAuthenticationConverterTest`**: Verification of RS256 JWT role and permission extraction.

---

## 17. External Dependencies & Integration Limitations

1. **Customer KYC Verification**:
   - In production, `CUSTOMER-SERVICE` must be online to verify customer KYC status before an application can be accepted. If unreachable, `AccountException.serviceUnavailable` is returned.
2. **Ledger Balance Verification**:
   - Balance verification during account closure contacts `LEDGER-SERVICE`. If `LEDGER-SERVICE` is unavailable, account closure is blocked to safeguard against closing an account with active un-reconciled funds.
3. **Kafka Broker Availability**:
   - If the Kafka broker is temporarily offline, Outbox events are safely persisted in `outbox_events` within the local PostgreSQL transaction. `OutboxPublisherTask` retries publishing with exponential backoff once the broker recovers.
