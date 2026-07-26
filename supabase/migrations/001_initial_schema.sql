-- Miss Nellore 2025 — Database Schema
-- Run this in your Supabase SQL editor

-- ─────────────────────────────────────────────────────────
-- CONTESTANTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contestants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  tagline       TEXT,
  bio           TEXT,
  photo_url     TEXT,
  category      TEXT,
  display_order INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- REGISTRATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,
  mobile          TEXT NOT NULL,
  email           TEXT,
  age             INT,
  address         TEXT,
  seat_tier       TEXT NOT NULL CHECK (seat_tier IN ('elite', 'gold')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_mobile ON registrations (mobile);
CREATE INDEX IF NOT EXISTS idx_reg_name_mobile ON registrations (LOWER(full_name), mobile);

-- ─────────────────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    TEXT REFERENCES registrations(application_id) ON DELETE CASCADE,
  amount            INT NOT NULL,
  utr_number        TEXT,
  screenshot_path   TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason  TEXT,
  verified_at       TIMESTAMPTZ,
  submitted_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- PASSES (created after payment is approved)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  TEXT UNIQUE REFERENCES registrations(application_id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  seat_tier       TEXT NOT NULL,
  qr_data_url     TEXT,
  issued_at       TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- SCAN LOGS (attendance)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  TEXT REFERENCES registrations(application_id) ON DELETE CASCADE,
  scanned_at      TIMESTAMPTZ DEFAULT now(),
  scanner_device  TEXT
);

-- One scan per person — enforced at DB level
CREATE UNIQUE INDEX IF NOT EXISTS scan_logs_one_per_person ON scan_logs (application_id);

-- ─────────────────────────────────────────────────────────
-- EVENT CONFIG (seat inventory)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_config (
  tier             TEXT PRIMARY KEY CHECK (tier IN ('elite', 'gold')),
  total_seats      INT NOT NULL,
  seats_remaining  INT NOT NULL,
  price            INT NOT NULL
);

INSERT INTO event_config VALUES
  ('elite', 100, 100, 1500),
  ('gold',  300, 300,  800)
ON CONFLICT (tier) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- ADMINS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt(password, 12)
  role          TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'scanner'))
);

-- ─────────────────────────────────────────────────────────
-- FUNCTION: reserve seat atomically
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reserve_seat(p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  available INT;
BEGIN
  SELECT seats_remaining INTO available
  FROM event_config WHERE tier = p_tier FOR UPDATE;

  IF available > 0 THEN
    UPDATE event_config SET seats_remaining = seats_remaining - 1 WHERE tier = p_tier;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────
-- STORAGE BUCKETS (run in SQL editor or Dashboard)
-- ─────────────────────────────────────────────────────────
-- In Supabase Dashboard > Storage, create:
--   1. "payment-screenshots" — private bucket
--   2. "contestant-photos"   — public bucket

-- ─────────────────────────────────────────────────────────
-- SEED: Create admin user (change password!)
-- Generate hash with: node -e "const b=require('bcryptjs'); b.hash('YourPassword123',12).then(console.log)"
-- Then paste the hash below:
-- ─────────────────────────────────────────────────────────
-- INSERT INTO admins (username, password_hash, role)
-- VALUES ('admin', '$2a$12$YOUR_BCRYPT_HASH_HERE', 'admin')
-- ON CONFLICT (username) DO NOTHING;
