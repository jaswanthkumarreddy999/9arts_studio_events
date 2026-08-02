-- Fix seating_config table columns
-- The table may have been created with old schema (chair_count instead of chair_row_count)
-- This migration ensures the correct columns exist

-- Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS seating_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sofa_count           INT NOT NULL DEFAULT 20,
  sofa_capacity        INT NOT NULL DEFAULT 2,
  round_table_count    INT NOT NULL DEFAULT 20,
  round_table_capacity INT NOT NULL DEFAULT 6,
  chair_row_count      INT NOT NULL DEFAULT 25,
  chairs_per_row       INT NOT NULL DEFAULT 10,
  capacity_overrides   JSONB NOT NULL DEFAULT '{}',
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if table already existed with old schema
ALTER TABLE seating_config
  ADD COLUMN IF NOT EXISTS chair_row_count      INT NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS capacity_overrides   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS sofa_count           INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS sofa_capacity        INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS round_table_count    INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS round_table_capacity INT NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS chairs_per_row       INT NOT NULL DEFAULT 10;
