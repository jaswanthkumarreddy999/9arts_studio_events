-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012: Flexible event settings
-- Adds: app_id_prefix, section bg images, section descriptions,
--        custom_sections, custom_fields, admin_tabs
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Application ID prefix ─────────────────────────────────────────────────────
ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS app_id_prefix TEXT DEFAULT '9AS';

-- ── Section background image URLs ────────────────────────────────────────────
ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS hero_bg_image        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_bg_image       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS contestants_bg_image TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sponsors_bg_image    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS register_bg_image    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_bg_image     TEXT DEFAULT '';

-- ── Section description overrides ────────────────────────────────────────────
ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS contestants_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sponsors_description    TEXT DEFAULT '';

-- ── Custom homepage sections ──────────────────────────────────────────────────
-- Array of: { id, title, subtitle, content, bg_image, bg_color, visible, display_order }
ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT '[]'::jsonb;

-- ── Custom registration fields ────────────────────────────────────────────────
-- Array of: { id, label, type, placeholder, required, options[] }
ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- ── Admin tab visibility config ───────────────────────────────────────────────
-- Array of: { key, visible }
ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS admin_tabs JSONB DEFAULT '[
    {"key": "registrations", "visible": true},
    {"key": "contestants",   "visible": true},
    {"key": "sponsors",      "visible": true},
    {"key": "seating",       "visible": true},
    {"key": "scanhistory",   "visible": true},
    {"key": "votes",         "visible": true},
    {"key": "register",      "visible": true},
    {"key": "settings",      "visible": true}
  ]'::jsonb;

-- ── Add extra_data column to registrations for custom field responses ─────────
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;
