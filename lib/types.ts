export const SEAT_TIERS = {
  elite: {
    label: 'Elite Pass',
    subtitle: 'Premium Front Seats',
    price: 1500,
    badge: '👑',
    color: 'amber',
    description: 'Best view, front rows, exclusive experience',
  },
  gold: {
    label: 'Gold Pass',
    subtitle: 'Standard Back Seats',
    price: 800,
    badge: '⭐',
    color: 'yellow',
    description: 'Great view, comfortable seating',
  },
} as const

export type SeatTier = keyof typeof SEAT_TIERS

export interface Registration {
  id: string
  application_id: string
  full_name: string
  mobile: string
  email?: string
  age: number
  address: string
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
