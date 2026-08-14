-- Migration 018: Pass custom overlay fields
-- Adds pass_custom_fields JSONB column to event_settings.
-- Admins can define extra text overlays (static text or sourced from extra_data)
-- that appear on the ticket template at drag-defined positions.
-- Run this in the Supabase SQL Editor.

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS pass_custom_fields JSONB DEFAULT '[]'::jsonb;
