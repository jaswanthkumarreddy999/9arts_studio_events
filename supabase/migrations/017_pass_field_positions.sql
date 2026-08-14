-- Migration 017: Dynamic pass field positions
-- Adds pass_field_positions JSONB column to event_settings.
-- The admin can drag overlay labels on a live preview to set where each field
-- (name, QR code, application ID, etc.) appears on the ticket template.
-- Run this in the Supabase SQL Editor.

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS pass_field_positions JSONB DEFAULT '{
    "name":           {"top": 21.5, "left": 52},
    "application_id": {"top": 38,   "left": 45},
    "mobile":         {"top": 48.5, "left": 55},
    "gender":         {"top": 59.2, "left": 55},
    "pass_type":      {"top": 69.5, "left": 55},
    "amount":         {"top": 86,   "left": 77},
    "qr":             {"top": 30,   "left": 70.2, "width": 23.4, "height": 33}
  }'::jsonb;
