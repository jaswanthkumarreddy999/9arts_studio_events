-- Seating configuration table
-- Stores a single row of venue layout settings

CREATE TABLE IF NOT EXISTS seating_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sofa_count          INT NOT NULL DEFAULT 20,
  sofa_capacity       INT NOT NULL DEFAULT 2,
  round_table_count   INT NOT NULL DEFAULT 20,
  round_table_capacity INT NOT NULL DEFAULT 6,
  chair_row_count     INT NOT NULL DEFAULT 25,
  chairs_per_row      INT NOT NULL DEFAULT 10,
  capacity_overrides  JSONB NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Only one config row ever exists
CREATE UNIQUE INDEX IF NOT EXISTS seating_config_single_row ON seating_config ((true));
