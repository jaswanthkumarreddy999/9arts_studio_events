export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0d0a1a 40%, #0a0a0f 100%)',
      }}
    >
      {/* Decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #4a1d8c, transparent)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #d4a520, transparent)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: 'radial-gradient(circle, #e11d48, transparent)' }}
        />
      </div>

      {/* Floating crowns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['top-20 left-10', 'top-32 right-16', 'bottom-40 left-16', 'bottom-20 right-10'].map(
          (pos, i) => (
            <span
              key={i}
              className="absolute text-4xl opacity-10 float"
              style={{ animationDelay: `${i * 0.7}s` }}
            >
              <span className={`absolute ${pos}`}>👑</span>
            </span>
          )
        )}
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-full px-4 py-2 text-yellow-400 text-sm font-medium mb-8">
          <span>✨</span>
          <span>Nellore&apos;s Most Prestigious Beauty Pageant</span>
          <span>✨</span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-7xl font-bold mb-4 leading-tight">
          <span className="shimmer block">Miss Nellore</span>
          <span className="text-white text-3xl sm:text-5xl mt-2 block">2025</span>
        </h1>

        <p className="text-zinc-300 text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
          A celebration of beauty, grace, and talent from Nellore, Andhra Pradesh.
          Join us for an unforgettable evening.
        </p>

        {/* Event details pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
            📅 August 2, 2026
          </span>
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
            📍 Nellore Convention Center
          </span>
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
            🎟️ Limited Seats
          </span>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#register"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-8 py-4 rounded-full text-lg hover:from-yellow-500 hover:to-yellow-300 transition-all shadow-lg hover:shadow-yellow-500/25 hover:scale-105 active:scale-95"
          >
            👑 Register Now
          </a>
          <a
            href="#contestants"
            className="inline-flex items-center justify-center gap-2 border border-yellow-700/50 text-yellow-400 font-semibold px-8 py-4 rounded-full text-lg hover:bg-yellow-900/20 transition-all"
          >
            Meet Contestants →
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
