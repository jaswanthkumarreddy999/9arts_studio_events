-- Miss Nellore 2026 — Migration 002: Voting system
-- Run this in your Supabase SQL editor

-- ─────────────────────────────────────────────────────────
-- VOTES table
-- One vote per registered attendee (application_id), for a contestant
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  TEXT NOT NULL REFERENCES registrations(application_id) ON DELETE CASCADE,
  contestant_id   UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  voted_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT votes_one_per_person UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_contestant ON votes (contestant_id);

-- Add bio column to contestants if not already present
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS bio TEXT;
