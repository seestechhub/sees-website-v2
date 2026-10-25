-- Migration: 005_outbox_acceptance.sql
-- Description: Name provider acceptance accurately; it is not confirmed recipient delivery.
ALTER TABLE outbox DROP CONSTRAINT outbox_status_check;
UPDATE outbox SET status='accepted' WHERE status='sent';
ALTER TABLE outbox ADD CONSTRAINT outbox_status_check CHECK (status IN ('queued','processing','accepted','failed','uncertain'));
