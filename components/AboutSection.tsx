export default function AboutSection() {
  const highlights = [
    { icon: '🏆', title: 'Grand Prize', desc: 'Crown, trophy & exciting prizes for the winner' },
    { icon: '💃', title: 'Dance Performance', desc: 'Dancers perform and display their unique talents' },
    { icon: '👗', title: 'Fashion Walk', desc: 'Elegant ramp walk in traditional and western attire' },
    { icon: '🎤', title: 'Q&A Round', desc: 'Thoughtful questions to highlight personality and intelligence' },
    { icon: '📸', title: 'Photo Shoot', desc: 'Professional photography for all contestants' },
    { icon: '🌟', title: 'Felicitation', desc: 'Special felicitation for all Guest and Sponsors' },
  ]

  return (
    <section
      id="about"
      className="py-20 sm:py-28"
      style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0a1a 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-yellow-500 text-sm font-semibold uppercase tracking-widest mb-3">
            About The Event
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            A Night of{' '}
            <span className="shimmer">Elegance & Grace</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Miss Nellore 2026 is more than a beauty pageant — it&apos;s a platform for talented
            young women of Nellore to shine, inspire, and make their mark.
          </p>
        </div>

        {/* Main content */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {/* Left: Text */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Celebrating Beauty, Talent & Confidence
            </h3>
            <p className="text-zinc-400 leading-relaxed mb-6">
              This year&apos;s edition promises to be grander than ever. With contestants from
              across Nellore district competing in multiple rounds, the evening will be filled
              with glamour, entertainment, and inspiration.
            </p>
            <p className="text-zinc-400 leading-relaxed mb-8">
              The event brings together families, friends, and supporters for an unforgettable
              evening celebrating the remarkable women of our community.
            </p>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">25+</div>
                <div className="text-sm text-zinc-500 mt-1">Contestants</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">400+</div>
                <div className="text-sm text-zinc-500 mt-1">Seats Available</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">1st</div>
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
              { label: 'Date', value: 'December 15, 2025', icon: '📅' },
              { label: 'Day', value: 'Monday', icon: '🗓️' },
              { label: 'Venue', value: 'Nellore Convention Center', icon: '📍' },
              { label: 'Location', value: 'Nellore, Andhra Pradesh', icon: '🗺️' },
              { label: 'Time', value: '6:00 PM onwards', icon: '⏰' },
              { label: 'Dress Code', value: 'Formal / Traditional', icon: '👔' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">{item.label}</div>
                  <div className="text-white font-medium">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highlights grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="bg-white/5 border border-white/10 hover:border-yellow-700/50 rounded-xl p-5 transition-all hover:bg-white/8"
            >
              <div className="text-3xl mb-3">{h.icon}</div>
              <h4 className="font-semibold text-white mb-1">{h.title}</h4>
              <p className="text-zinc-500 text-sm leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
