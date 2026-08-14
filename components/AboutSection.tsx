import { supabaseAdmin } from '@/lib/supabase'
import { type EventSettings, DEFAULT_EVENT_SETTINGS } from '@/lib/types'
import { buildTierMap } from '@/lib/eventSettings'

export default async function AboutSection({ settings: s = DEFAULT_EVENT_SETTINGS }: { settings?: EventSettings }) {
  const tierMap = buildTierMap(s)

  // Count approved seats per tier dynamically
  let totalRemaining = 0
  try {
    const { data: approvals } = await supabaseAdmin
      .from('payments')
      .select('registrations!inner(seat_tier)')
      .eq('status', 'approved')

    const taken: Record<string, number> = {}
    for (const key of Object.keys(tierMap)) taken[key] = 0

    for (const row of approvals ?? []) {
      const reg = row.registrations as { seat_tier: string } | { seat_tier: string }[]
      const tier = Array.isArray(reg) ? reg[0]?.seat_tier : reg?.seat_tier
      if (tier && tier in taken) taken[tier]++
    }

    let total = 0
    for (const [key, info] of Object.entries(tierMap)) {
      total += Math.max(0, info.totalSeats - (taken[key] ?? 0))
    }
    totalRemaining = total
  } catch { /* use 0 */ }

  return (
    <section
      id="about"
      className="py-20 sm:py-28"
      style={s.about_bg_image
        ? { backgroundImage: `url(${s.about_bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'local' }
        : { background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0a1a 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-yellow-500 text-sm font-semibold uppercase tracking-widest mb-3">
            {s.about_subtitle}
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            <span className="shimmer">{s.about_title}</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            {s.about_description}
          </p>
        </div>

        {/* Main content */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {/* Left: Text */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Celebrating the Best of {s.event_name}
            </h3>
            <p className="text-zinc-400 leading-relaxed mb-6">
              {s.hero_description}
            </p>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{s.stat_contestants_label}</div>
                <div className="text-sm text-zinc-500 mt-1">Contestants</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{totalRemaining}</div>
                <div className="text-sm text-zinc-500 mt-1">Seats Left</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{s.stat_edition_label}</div>
                <div className="text-sm text-zinc-500 mt-1">Edition</div>
              </div>
            </div>
          </div>

          {/* Right: Event details card */}
          <div className="bg-white/5 border border-yellow-900/30 rounded-2xl p-8 glow">
            <h4 className="text-yellow-400 font-semibold text-sm uppercase tracking-widest mb-6">
              Event Details
            </h4>
            {[
              { label: 'Date',      value: s.event_date,    icon: '📅', href: null },
              { label: 'Day',       value: s.event_day,     icon: '🗓️', href: null },
              { label: 'Time',      value: s.event_time,    icon: '⏰', href: null },
              { label: 'Venue',     value: s.venue_name,    icon: '📍', href: s.venue_maps_url || null },
              { label: 'Location',  value: s.venue_address, icon: '🗺️', href: null },
              { label: 'Organizer', value: s.organizer_name,icon: '🎭', href: null },
            ].filter(item => item.value && item.value !== 'TBA' && item.value !== 'Venue TBA').map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">{item.label}</div>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer"
                      className="text-white font-medium hover:text-yellow-400 transition-colors underline underline-offset-2 decoration-yellow-700">
                      {item.value} ↗
                    </a>
                  ) : (
                    <div className="text-white font-medium">{item.value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highlights grid */}
        {s.about_highlights.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {s.about_highlights.map((h) => (
              <div key={h.title}
                className="bg-white/5 border border-white/10 hover:border-yellow-700/50 rounded-xl p-5 transition-all hover:bg-white/8">
                <div className="text-3xl mb-3">{h.icon}</div>
                <h4 className="font-semibold text-white mb-1">{h.title}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
