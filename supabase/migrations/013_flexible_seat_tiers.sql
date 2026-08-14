-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013: Flexible seat tiers
-- Removes the hardcoded CHECK (seat_tier IN ('elite', 'gold')) constraint
-- so that custom pass tiers added via admin event settings can be registered.
-- Run this in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the old CHECK constraint (named by Postgres as registrations_seat_tier_check)
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_seat_tier_check;
