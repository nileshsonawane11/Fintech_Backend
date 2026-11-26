# FinBank Loan Service (`LOAN-SERVICE`)

Production-oriented Loan Origination, Disbursement Saga, and Loan Repayment microservice for the FinBank Spring Boot ecosystem (port `8087`, Eureka service ID `LOAN-SERVICE`).

## Core Capabilities

1. **Dynamic Loan Products & Promotional Offers** (`V5`, `V6`)
   - Database-driven products (`HOME_LOAN`, `BUSINESS_LOAN`, `AGRICULTURE_LOAN`, `VEHICLE_LOAN`, `GOLD_LOAN`, `LAP_LOAN`, `EDUCATION_LOAN`), soft deletion, and non-retroactive versioned offers (`loan_application_offer_snapshots`).
2. **Loan Origination & Lifecycle State Machine**
   - `SUBMITTED -> UNDER_REVIEW -> DOCUMENT_VERIFICATION -> APPROVED -> OFFER_ACCEPTED -> DISBURSEMENT_PENDING -> DISBURSED` (+ `ADDITIONAL_INFORMATION_REQUIRED`, `REJECTED`, `CANCELLED`, `EXPIRED`).
3. **Authoritative Loan Disbursement Saga (`LoanDisbursementService`)**
   - Uses `approvedAmount` (never blindly `requestedAmount`).
   - Validates destination account via `ACCOUNT-SERVICE` and posts double-entry disbursement (`DEBIT SYSTEM-LOAN-PRINCIPAL-INR`, `CREDIT destinationAccountId`) via `LEDGER-TRANSACTION-SERVICE`.
   - Persists `loan_disbursements` + `loan_accounts` + versioned EMI schedule (`loan_repayment_schedules`, `loan_schedule_versions`).
   - Handles partial failures via `loan_repayment_reconciliations` and provides staff anomaly audit/repair (`/api/v1/loans/ops/disbursement-anomalies`).
4. **Loan Repayment Facility (`V7`)**
   - **Repayment Accounts** (`/api/v1/loans/{loanAccountId}/repayment-accounts`): Masked display, primary selection, safe deactivation blocked when active mandates/collections exist.
   - **Mandates** (`/api/v1/loans/{loanAccountId}/repayment-mandates`): `INTERNAL_AUTODEBIT`, `UPI_AUTOPAY`, `ENACH` (via `PAYMENT-SERVICE`, staying `PENDING` until provider confirmation).
   - **Manual & Automatic Repayments**: Idempotent internal FinBank debits via `LEDGER-TRANSACTION-SERVICE` and external collections via `PAYMENT-SERVICE` + signed webhooks (`/api/v1/loans/webhooks/payments/{provider}`, `/mandates/{provider}`).
   - **Allocation Waterfall (`PaymentAllocationService`)**: Contractual waterfall (Charges -> Overdue/Installment Interest -> Principal -> Advance Principal) with partial payment tracking (`PARTIALLY_PAID`) and full reversal support.
   - **Overdue, Grace Period, Prepayment & Foreclosure**: Automated reminders, scheduled auto-collection with DB locking, DPD & contractual penal charges, part-prepayment schedule regeneration, and full foreclosure closure (`CLOSED`).

## Inter-Service Dependencies

- `CUSTOMER-SERVICE`: Customer & KYC verification (`APPROVED` / `VERIFIED`).
- `ACCOUNT-SERVICE`: Account ownership, type, active status, and holds.
- `LEDGER-TRANSACTION-SERVICE`: Authoritative account balances, multi-line double-entry postings (`LOAN_DISBURSEMENT`, `LOAN_REPAYMENT`, `LOAN_PREPAYMENT`, `LOAN_FORECLOSURE`), and reversals.
- `PAYMENT-SERVICE`: External collections (`UPI`, `NET_BANKING`, `CARD`, `UPI_AUTOPAY`, `ENACH`) and recurring mandate registrations.
- `NOTIFICATION-SERVICE`: Role-aware and customer lifecycle, reminder, settlement, and failure notifications.
