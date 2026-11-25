-- V1: Create notification_service tables

CREATE TABLE IF NOT EXISTS notifications (
    id           VARCHAR(36)   NOT NULL PRIMARY KEY,
    notification_id VARCHAR(20) NOT NULL UNIQUE,
    customer_id  VARCHAR(50)   NOT NULL,
    template_code VARCHAR(100) NOT NULL,
    channel      VARCHAR(20)   NOT NULL CHECK (channel IN ('IN_APP', 'SMS', 'EMAIL')),
    title        VARCHAR(255)  NOT NULL,
    body         TEXT          NOT NULL,
    read         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_customer_id
    ON notifications (customer_id);

CREATE INDEX IF NOT EXISTS idx_notifications_customer_unread
    ON notifications (customer_id, read);

CREATE TABLE IF NOT EXISTS support_tickets (
    id                VARCHAR(36)  NOT NULL PRIMARY KEY,
    ticket_id         VARCHAR(20)  NOT NULL UNIQUE,
    customer_id       VARCHAR(50)  NOT NULL,
    category          VARCHAR(30)  NOT NULL CHECK (category IN ('PAYMENT_ISSUE', 'ACCOUNT_ISSUE', 'CARD_ISSUE', 'LOAN_ISSUE', 'GENERAL')),
    subject           VARCHAR(255) NOT NULL,
    description       TEXT         NOT NULL,
    related_payment_id VARCHAR(50),
    status            VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id
    ON support_tickets (customer_id);
