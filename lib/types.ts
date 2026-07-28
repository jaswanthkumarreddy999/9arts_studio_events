export const SEAT_TIERS = {
  elite: {
    label: 'Elite Pass',
    subtitle: 'Premium Front Seats',
    price: 499,
    originalPrice: 599,
    badge: '👑',
    color: 'amber',
    description: 'Best view, front rows, exclusive experience',
    totalSeats: 250,
  },
  gold: {
    label: 'Gold Pass',
    subtitle: 'Standard Back Seats',
    price: 299,
    originalPrice: 399,
    badge: '⭐',
    color: 'yellow',
    description: 'Great view, comfortable seating',
    totalSeats: 250,
  },
} as const

export type SeatTier = keyof typeof SEAT_TIERS

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
