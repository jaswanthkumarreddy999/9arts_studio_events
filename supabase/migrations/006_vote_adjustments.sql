-- Migration 006: Manual vote adjustments per contestant per category
-- displayed_count = real_votes + adjustment (can be negative to reduce)

CREATE TABLE IF NOT EXISTS vote_adjustments (
  contestant_id       UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  contestant_category TEXT NOT NULL CHECK (contestant_category IN ('kid', 'teen', 'miss', 'misses')),
  adjustment          INT NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (contestant_id, contestant_category)
);
