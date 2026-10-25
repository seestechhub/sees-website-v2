-- Migration: 003_operations.sql
-- Description: Immutable application audit history and encrypted transactional email outbox.
CREATE TABLE audit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id UUID,
    action VARCHAR(80) NOT NULL,
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE FUNCTION prevent_audit_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are append only';
END;
$$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encrypted_payload TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','sent','failed','uncertain')),
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error VARCHAR(160)
);
CREATE INDEX outbox_jobs_idx ON outbox(status,available_at);
