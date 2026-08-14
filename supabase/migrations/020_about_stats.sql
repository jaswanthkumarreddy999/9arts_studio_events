-- Migration 020: Dynamic About section stats
-- Adds about_stats JSONB column to event_settings.
-- Replaces the hardcoded stat_contestants_label / stat_edition_label pair
-- with a fully dynamic array of { id, value, label, auto? } entries.
-- Run this in the Supabase SQL Editor.

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS about_stats JSONB DEFAULT '[
    {"id": "stat1", "value": "31+", "label": "Contestants"},
    {"id": "stat2", "value": "",    "label": "Seats Left",  "auto": "seats_left"},
    {"id": "stat3", "value": "1st", "label": "Edition"}
  ]'::jsonb;
