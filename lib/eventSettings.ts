import { supabaseAdmin } from './supabase'
import { type EventSettings, DEFAULT_EVENT_SETTINGS } from './types'

// Server-side fetch — used in Server Components and API routes
// Returns merged result: DB values override defaults (handles partially-set rows)
export async function getEventSettings(): Promise<EventSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('event_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) return DEFAULT_EVENT_SETTINGS

    // Merge: DB values win, fall back to defaults for any missing keys
    return { ...DEFAULT_EVENT_SETTINGS, ...data } as EventSettings
  } catch {
    return DEFAULT_EVENT_SETTINGS
  }
}

// Build a pass tier lookup map from event settings
// (mirrors SEAT_TIERS but driven by DB)
export function buildTierMap(settings: EventSettings): Record<string, {
  label: string; subtitle: string; badge: string; price: number
  originalPrice: number; totalSeats: number; closed: boolean
  description: string; color: string
}> {
  const map: ReturnType<typeof buildTierMap> = {}
  for (const t of settings.pass_tiers) {
    map[t.key] = {
      label: t.label,
      subtitle: t.subtitle,
      badge: t.badge,
      price: t.price,
      originalPrice: t.originalPrice,
      totalSeats: t.totalSeats,
      closed: t.closed,
      description: t.description,
      color: t.color,
    }
  }
  return map
}
