-- Migration 003: 4-category voting + registration status management

-- ─────────────────────────────────────────────────────────
-- Add contestant_category column to enforce the 4 categories
-- ─────────────────────────────────────────────────────────
ALTER TABLE contestants
  ADD COLUMN IF NOT EXISTS contestant_category TEXT
    CHECK (contestant_category IN ('kid', 'teen', 'miss', 'misses'));

-- ─────────────────────────────────────────────────────────
-- Drop old votes table and recreate with per-category constraint
-- One vote per (application_id, contestant_category)
-- ─────────────────────────────────────────────────────────
DROP TABLE IF EXISTS votes;

CREATE TABLE votes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        TEXT NOT NULL REFERENCES registrations(application_id) ON DELETE CASCADE,
  contestant_id         UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  contestant_category   TEXT NOT NULL CHECK (contestant_category IN ('kid', 'teen', 'miss', 'misses')),
  voted_at              TIMESTAMPTZ DEFAULT now(),
  -- One vote per person per category
  CONSTRAINT votes_one_per_category UNIQUE (application_id, contestant_category)
);

CREATE INDEX IF NOT EXISTS idx_votes_contestant ON votes (contestant_id);
CREATE INDEX IF NOT EXISTS idx_votes_category ON votes (contestant_category);

-- ─────────────────────────────────────────────────────────
-- Add registration_status to registrations
-- Values: active (default), done, payment_pending, review, deleted
-- ─────────────────────────────────────────────────────────
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'active'
    CHECK (registration_status IN ('active', 'done', 'payment_pending', 'review', 'deleted'));

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS status_note TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reg_status ON registrations (registration_status);
