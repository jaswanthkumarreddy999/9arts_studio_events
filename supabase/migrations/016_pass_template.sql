-- Migration 016: Dynamic pass template
-- Adds pass_template_url to event_settings so admins can upload a custom
-- ticket background image from the dashboard.
-- Run this in the Supabase SQL Editor.

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS pass_template_url TEXT DEFAULT '';
