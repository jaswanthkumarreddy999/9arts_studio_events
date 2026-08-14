-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014: Dynamic payment QR image and mobile number
-- Adds payment_mobile and payment_qr_url to event_settings so admins can
-- set them from the dashboard without a code deploy.
-- Run this in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS payment_mobile  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_qr_url  TEXT DEFAULT '';
