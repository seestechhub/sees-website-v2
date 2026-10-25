-- Migration: 004_subscriptions.sql
-- Description: Independent newsletter consent, confirmation and unsubscribe credentials.
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL UNIQUE CHECK (email = LOWER(email)),
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','unsubscribed')),
    consent_version VARCHAR(40) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    confirm_hash VARCHAR(64) UNIQUE,
    confirm_expires_at TIMESTAMPTZ,
    unsubscribe_hash VARCHAR(64) NOT NULL UNIQUE,
    CHECK (status <> 'active' OR confirmed_at IS NOT NULL),
    CHECK ((confirm_hash IS NULL) = (confirm_expires_at IS NULL))
);
COMMENT ON TABLE subscriptions IS 'Independent double opt-in consent; member registration never changes this table.';
