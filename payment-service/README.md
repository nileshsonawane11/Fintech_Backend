# FinBank – Payment Service (`payment-service`)

Production-oriented Spring Boot microservice for FinBank handling **incoming bank/UPI collections (Razorpay Smart Collect 2.0)**, **outgoing bank/UPI payouts (RazorpayX Payouts)**, **beneficiary registry and account/VPA validation (RazorpayX Account Validation)**, **idempotency**, **reconciliation**, **double-entry ledger integration**, and **transactional outbox/inbox Kafka domain events**.

---

## 1. Architecture Overview & Module Responsibilities

`PAYMENT-SERVICE` runs on port `8085`, registers with `SERVICE-DISCOVERY` (`8761`), and sits behind `API-GATEWAY` (`8080`).

| Module | Package | Responsibility |
|---|---|---|
| **Centralized Constants & Config** | `constants`, `config` | `PaymentConstants`, `RazorpayProperties`, `SecurityConfig`, `RestClientConfig`, `CorrelationIdFilter`, `PaymentKafkaConfig`, `OpenApiConfig` |
| **Internal Service Clients** | `client`, `client.dto` | `@LoadBalanced` `RestClient` clients for `CUSTOMER-SERVICE` (KYC & profile), `ACCOUNT-SERVICE` (ownership, status, holds), and `LEDGER-TRANSACTION-SERVICE` (balances, atomic batch postings, reversals) |
| **Provider Abstraction** | `provider` | Provider-agnostic `IncomingCollectionProvider`, `PayoutProvider`, `WebhookSignatureVerifier` interfaces |
| **Razorpay Smart Collect 2.0** | `provider.razorpay` | `RazorpaySmartCollectClient` (`/customers`, `/virtual_accounts`, `/virtual_accounts/{id}/payments`, `/virtual_accounts/{id}/close`, `/payments/{id}`, `/payments/{id}/refund`) |
| **RazorpayX Payouts & Validation** | `provider.razorpay` | `RazorpayXPayoutClient` (`/contacts`, `/fund_accounts`, `/fund_accounts/validations`, `/payouts`, `/payouts/{id}/cancel`) with `X-Payout-Idempotency` and timeout protection |
| **Beneficiary Management & Validation** | `service`, `controller` | Bank & UPI beneficiaries, AES-256-GCM encryption + deterministic HMAC/SHA-256 duplicate fingerprints, RazorpayX validation + name matching (`NameMatchSupport`) |
| **Incoming Payments** | `service`, `controller` | Smart Collect customer & virtual account provisioning, webhook verification, payment verification, eligibility-checked ledger credit, refunds |
| **Outgoing Transfers** | `service`, `controller` | Bank (`NEFT`/`IMPS`/`RTGS`) & `UPI` payouts, limits/fees+GST, atomic ledger debit (`SYSTEM-CLEARING-INR` + `SYSTEM-FEE-INR`), async settlement & automatic failure reversal |
| **Webhook Management** | `service`, `controller` | Raw-body `X-Razorpay-Signature` HMAC-SHA256 verification, duplicate `event_id` idempotency, Smart Collect & RazorpayX event dispatch |
| **Reconciliation & Operations** | `service`, `controller` | Scheduled & Ops-triggered stale transfer/incoming payment reconciliation, discrepancy tracking, Ops reversals/refunds, immutable audit logs |
| **Kafka Event-Driven Pipeline** | `event.model`, `event.producer`, `event.consumer` | Transactional `payment_outbox_events` publisher + idempotent `payment_inbox_events` consumer with DLT |

---

## 2. Database Schema & Entity Relationships (`fintech_payment`)

Flyway migrations (`src/main/resources/db/migration`):
- `V1__create_payment_tables.sql` – Base `beneficiaries`, `payments`, `payment_idempotency_keys`, `webhook_events`
- `V2__expand_public_identifiers.sql` – Public ID length expansion
- `V3__align_currency_column_type.sql` – Currency `VARCHAR(3)` alignment
- `V4__expand_beneficiary_account_number_for_encryption.sql` – Encrypted account column expansion
- `V5__evolve_payment_schema_for_razorpay.sql` – Evolves existing tables for UPI, deterministic hashes, multi-event webhooks, fees/ledger linkage, and adds:
  - `payment_customers` (maps `user_id` / `customer_id` to `razorpay_customer_id`)
  - `incoming_payment_receivers` (Smart Collect virtual accounts & VPAs mapped to `finbank_account_id`)
  - `incoming_payments` (inbound collections, UTR, ledger credit/refund references)
  - `beneficiary_validations` (validation mode, registered name, match score, status details)
  - `provider_contacts` & `provider_fund_accounts` (RazorpayX contact & fund account registry)
  - `payment_fee_configs` & `payment_limit_configs` (INR mode-specific fees, GST, min/max/daily limits)
  - `reconciliation_records` (discrepancy tracking & Ops resolution)
  - `payment_audit_logs` (immutable actor/action trail)
  - `payment_outbox_events` & `payment_inbox_events` (transactional outbox & idempotent inbox)
- `V6__seed_payment_fees_and_limits.sql` – Seeds INR fee & limit defaults for `IMPS`, `NEFT`, `RTGS`, `UPI`, `INCOMING`.

### Key Entity Relationships
- `payment_customers` (1) ── (N) `incoming_payment_receivers` (1) ── (N) `incoming_payments`
- `beneficiaries` (1) ── (N) `beneficiary_validations`
- `beneficiaries` (1) ── (0..1) `provider_fund_accounts` (N) ── (1) `provider_contacts`
- `beneficiaries` (1) ── (N) `payments` (via `beneficiary_id`, customer ownership enforced)
- `payments` (1) ── (1) `payment_idempotency_keys`

---

## 3. Service-to-Service Communication

All internal REST calls use `@LoadBalanced RestClient` with Eureka service IDs (never hardcoded URLs) and propagate `X-Correlation-Id`:

| Target Service | Service ID | Endpoints Used | Purpose |
|---|---|---|---|
| **Customer Service** | `CUSTOMER-SERVICE` | `GET /api/v1/customers/me`, `GET /api/v1/customers/by-identity/{identitySubject}` | Profile lookup & mandatory `kycStatus == APPROVED` check |
| **Account Service** | `ACCOUNT-SERVICE` | `GET /internal/api/v1/accounts/{accountId}`, `GET /internal/api/v1/accounts/{accountId}/holds` | Account ownership, `ACTIVE` status, currency, hold checks |
| **Ledger Service** | `LEDGER-TRANSACTION-SERVICE` | `GET /internal/api/v1/ledger/accounts/{accountId}/balance`, `POST /internal/api/v1/ledger/postings/batch`, `POST /internal/api/v1/ledger/transactions/{transactionId}/reverse` | Live `availableBalance`, atomic double-entry debit/credit/fee journals (`X-Internal-Service-Secret`), compensating reversals |

Account ownership and holds remain strictly in `ACCOUNT-SERVICE`, and all balances/ledger entries remain strictly in `LEDGER-TRANSACTION-SERVICE`.

---

## 4. REST API Endpoints (`/api/v1/` & `/ops/api/v1/`)

### Beneficiaries (`/api/v1/beneficiaries`)
- `POST /api/v1/beneficiaries` — Add bank account beneficiary (`ACCOUNT_NUMBER` AES-GCM encrypted)
- `POST /api/v1/beneficiaries/upi` — Add UPI VPA beneficiary
- `GET /api/v1/beneficiaries` — List customer beneficiaries (masked)
- `GET /api/v1/beneficiaries/{beneficiaryId}` — Get beneficiary details
- `POST /api/v1/beneficiaries/{beneficiaryId}/validate` — Initiate RazorpayX account/VPA validation
- `GET /api/v1/beneficiaries/{beneficiaryId}/validation-status` — Fetch/refresh validation status
- `DELETE /api/v1/beneficiaries/{beneficiaryId}` — Deactivate beneficiary

### Incoming Payments (`/api/v1/payments/incoming`)
- `POST /api/v1/payments/incoming/receivers` — Create or retrieve Smart Collect 2.0 virtual account & VPA
- `GET /api/v1/payments/incoming/receivers` — List customer receiving accounts
- `GET /api/v1/payments/incoming/receivers/{receiverId}` — Get receiving details
- `POST /api/v1/payments/incoming/receivers/{receiverId}/close` — Close virtual account
- `POST /api/v1/payments/incoming/receivers/{receiverId}/sync` — Sync incoming payments from Razorpay
- `GET /api/v1/payments/incoming` — List incoming payments
- `GET /api/v1/payments/incoming/{incomingPaymentId}` — Get incoming payment details

### Outgoing Transfers (`/api/v1/payments`)
- `POST /api/v1/payments/transfers` (requires `Idempotency-Key` UUID) — Initiate `NEFT`/`IMPS`/`RTGS`/`UPI` transfer
- `POST /api/v1/payments/transfers/upi` (requires `Idempotency-Key` UUID) — Initiate `UPI` payout
- `GET /api/v1/payments/transfers` — List transfer history
- `GET /api/v1/payments/{paymentId}` — Get transfer details
- `GET /api/v1/payments/{paymentId}/status` — Sync & return live transfer status
- `POST /api/v1/payments/{paymentId}/cancel` — Cancel `QUEUED` payout

### Webhooks (`/api/v1/payments/webhooks`, signature-authenticated)
- `POST /api/v1/payments/webhooks/razorpay/smart-collect` (`X-Razorpay-Signature`, `X-Razorpay-Event-Id`)
- `POST /api/v1/payments/webhooks/razorpayx` (`X-Razorpay-Signature`, `X-Razorpay-Event-Id`)
- `POST /api/v1/payments/webhooks/payment-rail` (legacy signed webhook)

### Operations & Administration (`/ops/api/v1/payments`, requires `OPERATIONS`/`ADMIN`/`MANAGER`)
- `POST /ops/api/v1/payments/reconciliation/run` — Run reconciliation
- `GET /ops/api/v1/payments/reconciliation/discrepancies` — List discrepancies
- `POST /ops/api/v1/payments/reconciliation/discrepancies/{reconciliationId}/resolve` — Resolve discrepancy
- `POST /ops/api/v1/payments/transfers/{paymentId}/sync` — Ops sync payout status
- `POST /ops/api/v1/payments/transfers/{paymentId}/reverse` — Ops compensating ledger reversal
- `POST /ops/api/v1/payments/incoming/{incomingPaymentId}/credit` — Credit verified incoming payment
- `POST /ops/api/v1/payments/incoming/{incomingPaymentId}/refund` — Refund incoming payment
- `GET /ops/api/v1/payments/audit-logs` — Query audit logs

#### Example: Add Bank Beneficiary
```json
POST /api/v1/beneficiaries
Authorization: Bearer <ACCESS_JWT>
{
  "nickname": "Rent Account",
  "beneficiaryName": "Priya Verma",
  "accountNumber": "123456789012",
  "confirmAccountNumber": "123456789012",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank",
  "accountType": "SAVINGS"
}
```

#### Example: Initiate Bank Transfer
```json
POST /api/v1/payments/transfers
Authorization: Bearer <ACCESS_JWT>
Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
{
  "debitAccountId": "ACC-1001",
  "beneficiaryId": "BEN-A1B2C3D4E5F6",
  "amount": 2500.00,
  "currency": "INR",
  "transferMode": "IMPS",
  "remarks": "Monthly rent"
}
```

---

## 5. Kafka Topics & Domain Events

All domain events use `PaymentEventEnvelope<T>` (`eventId`, `eventType`, `eventVersion: "1.0"`, `occurredAt` UTC, `correlationId`, `aggregateId`, `aggregateType`, `customerReference`, `providerReference`, `payload`) and are persisted in `payment_outbox_events` inside the database transaction before publishing.

- **`payment.incoming-events.v1`**: `IncomingPaymentInitiated`, `IncomingPaymentReceived`, `IncomingPaymentVerified`, `IncomingPaymentCredited`, `IncomingPaymentFailed`, `IncomingPaymentRefunded`
- **`payment.transfer-events.v1`**: `TransferInitiated`, `TransferSubmitted`, `TransferProcessing`, `TransferCompleted`, `TransferFailed`, `TransferReversed`
- **`payment.beneficiary-events.v1`**: `BeneficiaryCreated`, `BeneficiaryValidationInitiated`, `BeneficiaryVerified`, `BeneficiaryValidationFailed`, `BeneficiaryDeactivated`
- **`payment.reconciliation-events.v1`**: `ReconciliationStarted`, `ReconciliationCompleted`, `ReconciliationMismatchDetected`
- **Consumed**: `account.lifecycle-events.v1` (`groupId = payment-service-group`, idempotent via `payment_inbox_events`, failures routed to `account.lifecycle-events.v1.dlq` after 3 retries) — automatically closes active Smart Collect virtual accounts when an account is `CLOSED` or `BLOCKED`.

---

## 6. Environment Variables & Razorpay Setup

| Variable | Description | Default / Example |
|---|---|---|
| `PAYMENT_DB_URL` / `USERNAME` / `PASSWORD` | PostgreSQL connection | `jdbc:postgresql://localhost:5432/fintech_payment` |
| `PAYMENT_PII_ENCRYPTION_KEY` | Base64 32-byte AES-256-GCM key | *(required for encryption)* |
| `PAYMENT_PII_HASH_SALT` | Optional salt for deterministic duplicate hashing | `""` |
| `JWT_ISSUER` | Expected JWT `iss` claim | `identity-service` |
| `INTERNAL_SERVICE_TOKEN` | Shared `X-Internal-Service-Secret` for Ledger Service | `finbank-internal-secret-token` |
| `RAZORPAY_ENV` | `test` or `live` | `test` |
| `RAZORPAY_BASE_URL` | Razorpay API base URL | `https://api.razorpay.com/v1` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Smart Collect API credentials | *(keep outside VCS)* |
| `RAZORPAYX_KEY_ID` / `RAZORPAYX_KEY_SECRET` | RazorpayX credentials (falls back to `RAZORPAY_KEY_*`) | *(keep outside VCS)* |
| `RAZORPAYX_ACCOUNT_NUMBER` | RazorpayX business source account number | *(required for payouts & validations)* |
| `RAZORPAY_WEBHOOK_SECRET` | Smart Collect webhook signing secret | *(required for webhooks)* |
| `RAZORPAYX_WEBHOOK_SECRET` | RazorpayX webhook signing secret | *(falls back to `RAZORPAY_WEBHOOK_SECRET`)* |
| `RAZORPAY_SMART_COLLECT_REQUIRE_SETTLEMENT_CONFIRMATION` | Require Ops settlement confirmation before ledger credit | `false` (set `true` in regulated prod if T+1 settlement gating is needed) |

### Razorpay Dashboard Setup
1. **Smart Collect 2.0**: Enable Smart Collect 2.0 in Razorpay Dashboard, configure webhook URL `https://<gateway-host>/api/v1/payments/webhooks/razorpay/smart-collect` with `RAZORPAY_WEBHOOK_SECRET`, and subscribe to `virtual_account.created`, `virtual_account.credited`, `virtual_account.closed`, `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`.
2. **RazorpayX**: Activate RazorpayX Business Account / Current Account, whitelist production server egress IPs in RazorpayX Settings -> API Keys, configure webhook URL `https://<gateway-host>/api/v1/payments/webhooks/razorpayx` with `RAZORPAYX_WEBHOOK_SECRET`, and subscribe to `payout.queued`, `payout.pending`, `payout.initiated`, `payout.processed`, `payout.updated`, `payout.failed`, `payout.reversed`, `payout.rejected`, `fund_account.validation.completed`, `fund_account.validation.failed`.

---

## 7. Known Provider & Regulatory Limitations / Production Activation Checklist

1. **Test Mode Limitations**: Live NPCI/IMPS/NEFT/RTGS clearing, penny-drop/penniless bank name-match responses, and actual bank settlement timelines cannot be exercised end-to-end in Razorpay Test Mode; automated tests verify HTTP contracts using mocked Razorpay responses.
2. **Escrow / Current Account Prerequisite**: Smart Collect 2.0 and RazorpayX Payouts require an approved RazorpayX Lite or partner bank Current/Escrow account; `RAZORPAYX_ACCOUNT_NUMBER` must be provisioned before live payouts or validations succeed.
3. **Settlement vs. Ledger Balance**: Customer FinBank ledger balances are accounting entries in `LEDGER-TRANSACTION-SERVICE` (`SYSTEM-SETTLEMENT-INR` / `SYSTEM-CLEARING-INR`). Set `RAZORPAY_SMART_COLLECT_REQUIRE_SETTLEMENT_CONFIRMATION=true` if business/compliance policy prohibits crediting customers before Razorpay settlement payout clears.
4. **Regulatory Compliance**: Offering pooled virtual accounts or third-party money transfers requires appropriate RBI licensing/sponsor-bank arrangement and Razorpay merchant-category approval. Do not enable live keys without written Razorpay & legal compliance sign-off.
5. **Production Activation Checklist**:
   - Generate 32-byte `PAYMENT_PII_ENCRYPTION_KEY` & rotate `INTERNAL_SERVICE_TOKEN`.
   - Whitelist production IP addresses on RazorpayX Dashboard.
   - Verify HTTPS webhook endpoints and secrets (`RAZORPAY_WEBHOOK_SECRET`, `RAZORPAYX_WEBHOOK_SECRET`).
   - Run Flyway migrations `V1`–`V6` on `fintech_payment` and `V1`–`V3` on `fintech_ledger`.
   - Confirm Kafka topics & DLQs exist and monitoring alerts cover `payment_outbox_events` (`FAILED`), `reconciliation_records` (`OPEN`), and `UNKNOWN_PENDING_RECONCILIATION` transfers.

---

## 8. Running Locally & Testing

```bash
# Run all Payment Service unit, controller, Flyway, Kafka, and mocked Razorpay tests
mvn -pl payment-service test
```
