import { type EventSettings, DEFAULT_EVENT_SETTINGS } from '@/lib/types'

export default function ContactSection({ settings: s = DEFAULT_EVENT_SETTINGS }: { settings?: EventSettings }) {
  return (
    <section id="contact" className="py-16 sm:py-20 bg-black/70 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-10 items-start">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{s.event_icon}</span>
              <span className="font-bold text-lg shimmer">{s.event_name} {s.event_edition}</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {s.event_tagline}
            </p>
          </div>

          {/* Event info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Event Details</h4>
            <ul className="space-y-2 text-zinc-400 text-sm">
              {s.event_date && s.event_date !== 'TBA' && (
                <li className="flex items-start gap-2">
                  <span>📅</span> {s.event_date}
                </li>
              )}
              {s.event_time && (
                <li className="flex items-start gap-2">
                  <span>⏰</span> {s.event_time}
                </li>
              )}
              {s.venue_name && s.venue_name !== 'Venue TBA' && (
                <li className="flex items-start gap-2">
                  <span>📍</span>
                  {s.venue_maps_url ? (
                    <a href={s.venue_maps_url} target="_blank" rel="noopener noreferrer"
                      className="hover:text-yellow-400 transition-colors">
                      {s.venue_name}, {s.venue_address} ↗
                    </a>
                  ) : (
                    <span>{s.venue_name}, {s.venue_address}</span>
                  )}
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-zinc-400 text-sm">
              {s.contact_phone && (
                <li className="flex items-start gap-2">
                  <span>📞</span> +91 {s.contact_phone}
                </li>
              )}
              {s.contact_email && (
                <li className="flex items-start gap-2">
                  <span>📧</span> {s.contact_email}
                </li>
              )}
              {s.contact_instagram && (
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-pink-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <a href={`https://instagram.com/${s.contact_instagram}`} target="_blank" rel="noopener noreferrer"
                    className="hover:text-pink-400 transition-colors">
                    @{s.contact_instagram}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 text-center text-zinc-600 text-xs">
          © {s.event_edition || new Date().getFullYear()} {s.organizer_name}. All rights reserved.
        </div>
      </div>
    </section>
  )
}
