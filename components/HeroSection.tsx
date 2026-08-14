import { type EventSettings, DEFAULT_EVENT_SETTINGS } from '@/lib/types'

export default function HeroSection({ settings: s = DEFAULT_EVENT_SETTINGS }: { settings?: EventSettings }) {
  const bgStyle = s.hero_bg_image
    ? { backgroundImage: `url(${s.hero_bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0d0a1a 40%, #0a0a0f 100%)' }

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden" style={bgStyle}>
      {s.hero_bg_image && <div className="absolute inset-0 bg-black/60 z-0" />}

      {/* Decorative orbs */}
      {!s.hero_bg_image && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #4a1d8c, transparent)' }} />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--gold), transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
            style={{ background: 'radial-gradient(circle, #e11d48, transparent)' }} />
        </div>
      )}

      {/* Floating icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {['top-20 left-10', 'top-32 right-16', 'bottom-40 left-16', 'bottom-20 right-10'].map((pos, i) => (
          <span key={i} className="absolute text-4xl opacity-10 float" style={{ animationDelay: `${i * 0.7}s` }}>
            <span className={`absolute ${pos}`}>{s.event_icon}</span>
          </span>
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 accent-bg-dim accent-border rounded-full border px-4 py-2 accent-text text-sm font-medium mb-8">
          <span>✨</span>
          <span>{s.hero_badge_text}</span>
          <span>✨</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-7xl font-bold mb-4 leading-tight">
          <span className="shimmer block">{s.organizer_name}</span>
          <span className="shimmer block">{s.event_name}</span>
          {s.event_edition && (
            <span className="text-white text-3xl sm:text-5xl mt-2 block">{s.event_edition}</span>
          )}
        </h1>

        <p className="text-zinc-300 text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
          {s.hero_description}
        </p>

        {/* Event detail pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {s.event_date && s.event_date !== 'TBA' && (
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
              📅 {s.event_date}
            </span>
          )}
          {s.venue_name && s.venue_name !== 'Venue TBA' && (
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
              {s.venue_maps_url ? (
                <a href={s.venue_maps_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 transition-colors hover:accent-text">
                  📍 {s.venue_name}
                </a>
              ) : <>📍 {s.venue_name}</>}
            </span>
          )}
          {s.event_time && (
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
              ⏰ {s.event_time}
            </span>
          )}
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
            🎟️ Limited Seats
          </span>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#register"
            className="inline-flex items-center justify-center gap-2 btn-primary px-8 py-4 rounded-full text-lg shadow-lg hover:scale-105 active:scale-95">
            {s.event_icon} {s.hero_cta_primary}
          </a>
          <a href={s.hero_cta_secondary_href}
            className="inline-flex items-center justify-center gap-2 btn-accent-outline font-semibold px-8 py-4 rounded-full text-lg transition-all">
            {s.hero_cta_secondary} →
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 accent-text" style={{ color: 'var(--gold)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
