-- Migration: 001_accounts.sql
-- Description: Member identities, separate administrator identities and revocable sessions.
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matric VARCHAR(9) NOT NULL UNIQUE CHECK (matric ~ '^(18|19|21|23|24|25|26|27|28|29)04(08|03)[0-9]{3}$'),
    email VARCHAR(254) NOT NULL UNIQUE CHECK (email = LOWER(email)),
    name VARCHAR(160) NOT NULL,
    password_hash TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active','review','deactivated','deletion_pending')),
    evidence VARCHAR(24) NOT NULL DEFAULT 'format_validated' CHECK (evidence IN ('format_validated','roster_confirmed')),
    level INTEGER CHECK (level IN (100,200,300,400,500)),
    consent_version VARCHAR(40) NOT NULL,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL UNIQUE CHECK (email = LOWER(email)),
    name VARCHAR(160) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('editor','super_admin')),
    mfa_secret TEXT NOT NULL,
    last_totp_step BIGINT NOT NULL DEFAULT -1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((member_id IS NULL) <> (admin_id IS NULL))
);
CREATE INDEX sessions_member_idx ON sessions(member_id);
CREATE TABLE account_tokens (
    token_hash VARCHAR(64) PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('verify','reset')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);
CREATE TABLE rate_windows (
    key_hash VARCHAR(64) PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL
);
