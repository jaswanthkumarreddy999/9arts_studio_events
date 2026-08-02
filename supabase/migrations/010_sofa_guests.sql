-- Walk-in sofa guests (VIP / Parents / Sponsors)
-- These are people assigned to sofas without a registration in the system

CREATE TABLE IF NOT EXISTS sofa_guests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  remark      TEXT,          -- e.g. "Parent of Contestant 3", "Gold Sponsor"
  sofa_label  TEXT NOT NULL, -- e.g. "Sofa 1"
  seat_label  TEXT NOT NULL, -- e.g. "S1-2"
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sofa_guests_sofa ON sofa_guests (sofa_label);
