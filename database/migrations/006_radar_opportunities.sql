-- Migration: 006_radar_opportunities.sql
-- Description: Editorial RADAR listings; visitor progress stays on their device.
CREATE TABLE radar_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category VARCHAR(32) NOT NULL CHECK (category IN ('scholarships', 'uk', 'nigeria_internships', 'nigeria_jobs')),
    organisation VARCHAR(160) NOT NULL CHECK (LENGTH(TRIM(organisation)) > 0),
    title VARCHAR(200) NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
    kind VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(kind)) > 0),
    opens DATE NOT NULL,
    closes DATE,
    visa VARCHAR(12) NOT NULL DEFAULT 'unknown' CHECK (visa IN ('yes', 'no', 'unknown')),
    notes VARCHAR(2000) NOT NULL DEFAULT '',
    link VARCHAR(2048) NOT NULL CHECK (link ~ '^https?://'),
    last_verified DATE,

    status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (closes IS NULL OR closes >= opens),
    CHECK (status <> 'published' OR last_verified IS NOT NULL),
    CHECK (category = 'uk' OR visa = 'unknown')
);
COMMENT ON TABLE radar_opportunities IS 'Public editorial listings. No student application or tracking data is stored here.';
COMMENT ON COLUMN radar_opportunities.last_verified IS 'Date an editor checked the official listing, eligibility and sponsorship evidence.';
CREATE INDEX radar_opportunities_public ON radar_opportunities (category, closes) WHERE status = 'published';
