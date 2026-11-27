CREATE TABLE IF NOT EXISTS ledger_inbox_events (
    event_id VARCHAR(100) PRIMARY KEY,
    topic VARCHAR(150) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    consumer_group VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    error_message VARCHAR(500),
    received_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ
);
