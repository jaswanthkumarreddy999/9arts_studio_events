-- Migration 005: Replace age, email, address with gender field

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Drop old columns (safe — no longer used)
ALTER TABLE registrations DROP COLUMN IF EXISTS age;
ALTER TABLE registrations DROP COLUMN IF EXISTS email;
ALTER TABLE registrations DROP COLUMN IF EXISTS address;
