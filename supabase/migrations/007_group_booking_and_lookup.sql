-- Migration 007: Group booking + mobile lookup for forgot ID

-- Remove unique constraint on mobile (families share mobile)
-- Keep the index for query performance
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_mobile_key;
DROP INDEX IF EXISTS idx_reg_mobile;
CREATE INDEX IF NOT EXISTS idx_reg_mobile ON registrations (mobile);

-- Add group_id to link group bookings together (nullable — individual bookings have no group)
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS group_id TEXT;

CREATE INDEX IF NOT EXISTS idx_reg_group_id ON registrations (group_id);

-- Duplicate check is now (LOWER(full_name), mobile) — same name + same mobile = duplicate
-- The existing idx_reg_name_mobile index covers this
