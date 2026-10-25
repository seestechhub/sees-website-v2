-- Migration: 002_content.sql
-- Description: Versioned, permission-aware Society content and site configuration.
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('post','resource','executive','subbody','event','page')),
    slug VARCHAR(140) NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(600) NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    visibility VARCHAR(12) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','members')),
    status VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled','archived')),
    publish_at TIMESTAMPTZ,
    data JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    author_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(kind,slug),
    CHECK (status <> 'scheduled' OR publish_at IS NOT NULL)
);
CREATE INDEX content_listing_idx ON content(kind,status,publish_at);
CREATE TABLE content_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    actor_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(content_id,version)
);
