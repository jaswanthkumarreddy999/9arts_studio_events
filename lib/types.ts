// ─────────────────────────────────────────────────────────────────────────────
// PASS TIERS
// These are the static fallback defaults used when event_settings hasn't loaded.
// The real values come from event_settings.pass_tiers in the DB.
// ─────────────────────────────────────────────────────────────────────────────

export const SEAT_TIERS = {
  elite: {
    label: 'Elite Pass',
    subtitle: 'Premium Front Seats',
    price: 499,
    originalPrice: 599,
    badge: '👑',
    color: 'amber',
    description: 'Best view, front rows, exclusive experience',
    totalSeats: 120,
    closed: false,
  },
  gold: {
    label: 'Gold Pass',
    subtitle: 'Standard Seats',
    price: 299,
    originalPrice: 399,
    badge: '⭐',
    color: 'yellow',
    description: 'Great view, comfortable seating',
    totalSeats: 250,
    closed: false,
  },
} as const

export type SeatTier = keyof typeof SEAT_TIERS

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC PASS TIER (from event_settings.pass_tiers)
// ─────────────────────────────────────────────────────────────────────────────

export interface PassTierConfig {
  key: string            // 'elite' | 'gold' — must match DB constraint
  label: string          // "Elite Pass", "Workshop Pass", etc.
  subtitle: string       // "Premium Front Seats"
  badge: string          // emoji
  price: number          // ₹499
  originalPrice: number  // ₹599 (for strikethrough)
  totalSeats: number
  closed: boolean        // blocks public registration
  description: string
  color: string          // 'amber' | 'yellow' | 'blue' | etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT SETTINGS — mirrors the event_settings DB table
// ─────────────────────────────────────────────────────────────────────────────

export interface NavLink {
  href: string
  label: string
}

export interface AboutHighlight {
  icon: string
  title: string
  desc: string
}

export interface VoteCategory {
  key: string
  label: string
  icon: string
}

export interface EventSettings {
  // Branding
  event_name: string
  event_tagline: string
  event_edition: string
  organizer_name: string
  event_icon: string

  // Date & Venue
  event_date: string
  event_day: string
  event_time: string
  venue_name: string
  venue_address: string
  venue_maps_url: string

  // Contact
  contact_phone: string
  contact_email: string
  contact_instagram: string

  // SEO
  meta_title: string
  meta_description: string

  // Payment
  upi_id: string
  upi_name: string

  // Registration control
  registrations_open: boolean
  registrations_closed_message: string

  // Pass tiers
  pass_tiers: PassTierConfig[]

  // Sections visibility
  show_contestants: boolean
  show_sponsors: boolean
  show_voting: boolean

  // About section
  about_title: string
  about_subtitle: string
  about_description: string
  about_highlights: AboutHighlight[]
  stat_contestants_label: string
  stat_edition_label: string

  // Hero
  hero_badge_text: string
  hero_description: string
  hero_cta_primary: string
  hero_cta_secondary: string
  hero_cta_secondary_href: string

  // Navbar
  nav_links: NavLink[]

  // Vote categories
  vote_categories: VoteCategory[]

  updated_at?: string
}

// Default event settings — used as client-side fallback before DB loads
export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  event_name: '9 Arts Studio Event',
  event_tagline: 'An unforgettable experience',
  event_edition: '2026',
  organizer_name: '9 Arts Studio',
  event_icon: '🎭',

  event_date: 'TBA',
  event_day: 'Sunday',
  event_time: '10:00 AM',
  venue_name: 'Venue TBA',
  venue_address: 'Nellore, Andhra Pradesh',
  venue_maps_url: '',

  contact_phone: '9346039342',
  contact_email: '9artsstudio@gmail.com',
  contact_instagram: '9artsstudio',

  meta_title: '9 Arts Studio — Event',
  meta_description: 'Register for the upcoming event by 9 Arts Studio, Nellore.',

  upi_id: '9346039342@ibl',
  upi_name: '9 Arts Studio',

  registrations_open: true,
  registrations_closed_message: 'Online registrations are now closed. If you have already registered, you can check your pass below.',

  pass_tiers: [
    {
      key: 'elite',
      label: 'Elite Pass',
      subtitle: 'Premium Front Seats',
      badge: '👑',
      price: 499,
      originalPrice: 599,
      totalSeats: 120,
      closed: false,
      description: 'Best view, front rows, exclusive experience',
      color: 'amber',
    },
    {
      key: 'gold',
      label: 'Gold Pass',
      subtitle: 'Standard Seats',
      badge: '⭐',
      price: 299,
      originalPrice: 399,
      totalSeats: 250,
      closed: false,
      description: 'Great view, comfortable seating',
      color: 'yellow',
    },
  ],

  show_contestants: true,
  show_sponsors: true,
  show_voting: true,

  about_title: 'A Event of Elegance & Grace',
  about_subtitle: 'About The Event',
  about_description: 'Join us for an unforgettable experience.',
  about_highlights: [
    { icon: '🏆', title: 'Grand Prize',   desc: 'Crown, trophy & exciting prizes for the winner' },
    { icon: '💃', title: 'Performance',   desc: 'Performers display their unique talents' },
    { icon: '👗', title: 'Fashion Walk',  desc: 'Elegant ramp walk in traditional and western attire' },
    { icon: '🎤', title: 'Q&A Round',     desc: 'Thoughtful questions to highlight personality and intelligence' },
    { icon: '📸', title: 'Photo Shoot',   desc: 'Professional photography for all contestants' },
    { icon: '🌟', title: 'Felicitation',  desc: 'Special felicitation for all Guests and Sponsors' },
  ],
  stat_contestants_label: '31+',
  stat_edition_label: '1st',

  hero_badge_text: 'Nellore\'s Most Prestigious Event',
  hero_description: 'A celebration of talent from Nellore, Andhra Pradesh. Join us for an unforgettable evening.',
  hero_cta_primary: 'Register Now',
  hero_cta_secondary: 'Learn More',
  hero_cta_secondary_href: '#about',

  nav_links: [
    { href: '#home',        label: 'Home' },
    { href: '#about',       label: 'About' },
    { href: '#contestants', label: 'Contestants' },
    { href: '#register',    label: 'Register' },
    { href: '#contact',     label: 'Contact' },
  ],

  vote_categories: [
    { key: 'kid',    label: 'Little', icon: '🧒' },
    { key: 'teen',   label: 'Teen',   icon: '👧' },
    { key: 'miss',   label: 'Miss',   icon: '👩' },
    { key: 'misses', label: 'Misses', icon: '👑' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// OTHER DOMAIN TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Registration {
  id: string
  application_id: string
  full_name: string
  mobile: string
  gender: 'male' | 'female' | 'other'
  seat_tier: SeatTier
  created_at: string
}

export interface Payment {
  id: string
  application_id: string
  amount: number
  utr_number?: string
  screenshot_path?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  verified_at?: string
  submitted_at: string
}

export interface Pass {
  id: string
  application_id: string
  full_name: string
  seat_tier: SeatTier
  qr_data_url: string
  issued_at: string
}

export interface ScanLog {
  id: string
  application_id: string
  scanned_at: string
  scanner_device?: string
}

export interface Contestant {
  id: string
  name: string
  tagline?: string
  bio?: string
  photo_url?: string
  category?: string
  display_order: number
}
