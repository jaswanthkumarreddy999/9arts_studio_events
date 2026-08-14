-- Migration 015: Site-wide color theme
-- Adds theme_color to event_settings so admins can change the accent color
-- from the dashboard without a code deploy.
-- Run this in the Supabase SQL Editor.

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'gold';
