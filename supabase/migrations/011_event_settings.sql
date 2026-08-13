-- ─────────────────────────────────────────────────────────
-- EVENT SETTINGS — single-row table for full dynamic config
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_settings (
  id                    INT PRIMARY KEY DEFAULT 1,         -- always row 1
  CONSTRAINT single_row CHECK (id = 1),

  -- ── Branding ─────────────────────────────────────────
  event_name            TEXT NOT NULL DEFAULT '9 Arts Studio Event',
  event_tagline         TEXT DEFAULT 'An unforgettable experience',
  event_edition         TEXT DEFAULT '2026',
  organizer_name        TEXT DEFAULT '9 Arts Studio',
  event_icon            TEXT DEFAULT '🎭',                 -- emoji shown in navbar/header

  -- ── Date & Venue ─────────────────────────────────────
  event_date            TEXT DEFAULT 'TBA',               -- display string e.g. "August 6, 2026"
  event_day             TEXT DEFAULT 'Sunday',
  event_time            TEXT DEFAULT '10:00 AM',
  venue_name            TEXT DEFAULT 'Venue TBA',
  venue_address         TEXT DEFAULT 'Nellore, Andhra Pradesh',
  venue_maps_url        TEXT DEFAULT '',

  -- ── Contact ──────────────────────────────────────────
  contact_phone         TEXT DEFAULT '9346039342',
  contact_email         TEXT DEFAULT '9artsstudio@gmail.com',
  contact_instagram     TEXT DEFAULT '9artsstudio',       -- handle without @

  -- ── SEO / Meta ───────────────────────────────────────
  meta_title            TEXT DEFAULT '9 Arts Studio — Event',
  meta_description      TEXT DEFAULT 'Register for the upcoming event by 9 Arts Studio, Nellore.',

  -- ── Payment ──────────────────────────────────────────
  upi_id                TEXT DEFAULT '9346039342@ibl',
  upi_name              TEXT DEFAULT '9 Arts Studio',     -- shown on payment screen

  -- ── Registration control ─────────────────────────────
  registrations_open    BOOLEAN DEFAULT true,
  registrations_closed_message TEXT DEFAULT 'Online registrations are now closed. If you have already registered, you can check your pass below.',

  -- ── Pass tiers (JSON array) ───────────────────────────
  -- Each tier: { key, label, subtitle, badge, price, originalPrice, totalSeats, closed, description, color }
  -- key must be 'elite' or 'gold' to match existing DB CHECK constraint
  pass_tiers            JSONB DEFAULT '[
    {
      "key": "elite",
      "label": "Elite Pass",
      "subtitle": "Premium Front Seats",
      "badge": "👑",
      "price": 499,
      "originalPrice": 599,
      "totalSeats": 120,
      "closed": false,
      "description": "Best view, front rows, exclusive experience",
      "color": "amber"
    },
    {
      "key": "gold",
      "label": "Gold Pass",
      "subtitle": "Standard Seats",
      "badge": "⭐",
      "price": 299,
      "originalPrice": 399,
      "totalSeats": 250,
      "closed": false,
      "description": "Great view, comfortable seating",
      "color": "yellow"
    }
  ]'::jsonb,

  -- ── Homepage sections visibility ─────────────────────
  show_contestants      BOOLEAN DEFAULT true,
  show_sponsors         BOOLEAN DEFAULT true,
  show_voting           BOOLEAN DEFAULT true,

  -- ── About section content ────────────────────────────
  about_title           TEXT DEFAULT 'A Event of Elegance & Grace',
  about_subtitle        TEXT DEFAULT 'About The Event',
  about_description     TEXT DEFAULT 'Join us for an unforgettable experience.',
  about_highlights      JSONB DEFAULT '[
    {"icon": "🏆", "title": "Grand Prize",      "desc": "Crown, trophy & exciting prizes for the winner"},
    {"icon": "💃", "title": "Performance",       "desc": "Performers display their unique talents"},
    {"icon": "👗", "title": "Fashion Walk",      "desc": "Elegant ramp walk in traditional and western attire"},
    {"icon": "🎤", "title": "Q&A Round",         "desc": "Thoughtful questions to highlight personality and intelligence"},
    {"icon": "📸", "title": "Photo Shoot",       "desc": "Professional photography for all contestants"},
    {"icon": "🌟", "title": "Felicitation",      "desc": "Special felicitation for all Guests and Sponsors"}
  ]'::jsonb,

  -- ── Stats displayed in About ─────────────────────────
  stat_contestants_label TEXT DEFAULT '31+',
  stat_edition_label     TEXT DEFAULT '1st',

  -- ── Hero section ─────────────────────────────────────
  hero_badge_text       TEXT DEFAULT 'Nellore''s Most Prestigious Event',
  hero_description      TEXT DEFAULT 'A celebration of beauty, grace, and talent from Nellore, Andhra Pradesh. Join us for an unforgettable evening.',
  hero_cta_primary      TEXT DEFAULT 'Register Now',
  hero_cta_secondary    TEXT DEFAULT 'Learn More',
  hero_cta_secondary_href TEXT DEFAULT '#about',

  -- ── Navbar links (JSON array) ────────────────────────
  -- Each: { href, label }
  nav_links             JSONB DEFAULT '[
    {"href": "#home",        "label": "Home"},
    {"href": "#about",       "label": "About"},
    {"href": "#contestants", "label": "Contestants"},
    {"href": "#register",    "label": "Register"},
    {"href": "#contact",     "label": "Contact"}
  ]'::jsonb,

  -- ── Vote categories (JSON array) ─────────────────────
  -- Each: { key, label, icon }  — key must match contestant_category values
  vote_categories       JSONB DEFAULT '[
    {"key": "kid",    "label": "Little", "icon": "🧒"},
    {"key": "teen",   "label": "Teen",   "icon": "👧"},
    {"key": "miss",   "label": "Miss",   "icon": "👩"},
    {"key": "misses", "label": "Misses", "icon": "👑"}
  ]'::jsonb,

  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Seed the single row
INSERT INTO event_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Keep updated_at fresh on every update
CREATE OR REPLACE FUNCTION update_event_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_settings_updated_at ON event_settings;
CREATE TRIGGER trg_event_settings_updated_at
  BEFORE UPDATE ON event_settings
  FOR EACH ROW EXECUTE FUNCTION update_event_settings_timestamp();
