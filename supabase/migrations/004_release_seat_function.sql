-- Migration 004: release_seat function + seat tracking fix
-- Seats now decrement on payment APPROVAL, not on registration

-- ─────────────────────────────────────────────────────────
-- FUNCTION: release seat when payment is rejected/reversed
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION release_seat(p_tier TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE event_config
  SET seats_remaining = LEAST(total_seats, seats_remaining + 1)
  WHERE tier = p_tier;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────
-- Recalculate seats_remaining based on approved payments
-- (run once to sync after switching to approval-based counting)
-- ─────────────────────────────────────────────────────────
UPDATE event_config ec
SET seats_remaining = ec.total_seats - COALESCE((
  SELECT COUNT(*)
  FROM payments p
  JOIN registrations r ON r.application_id = p.application_id
  WHERE p.status = 'approved'
    AND r.seat_tier = ec.tier
), 0);
