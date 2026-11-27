-- V4: Add centralized event-driven notification metadata fields and read timestamp

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_service VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS aggregate_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS aggregate_id VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_customer_created
    ON notifications (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_source_service
    ON notifications (source_service);
