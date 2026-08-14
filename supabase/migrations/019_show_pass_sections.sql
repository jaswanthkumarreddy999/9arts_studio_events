-- Migration 019: My Pass page section visibility
-- Adds show_pass_download to event_settings.
-- show_voting already exists and is reused for both homepage and my-pass.
-- Run this in the Supabase SQL Editor.

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS show_pass_download BOOLEAN DEFAULT true;
