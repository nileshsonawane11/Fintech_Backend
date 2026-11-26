-- V3: Add role-aware notification fields and idempotent event deduplication key

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_id VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uk_notifications_event_id
    ON notifications (event_id)
    WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_target_role
    ON notifications (target_role, created_at DESC);
