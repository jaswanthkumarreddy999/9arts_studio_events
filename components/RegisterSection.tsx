import RegistrationForm from './RegistrationForm'

export default function RegisterSection() {
  return (
    <section id="register" className="py-20 sm:py-28"
      style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0a1a 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-block text-yellow-500 text-sm font-semibold uppercase tracking-widest mb-3">
            Secure Your Seat
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Register <span className="shimmer">Today</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Fill in your details, choose your pass, and complete payment to get your QR entry pass.
          </p>
        </div>

        {/* ── BOOKINGS CLOSED ── */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white/5 border border-white/10 rounded-3xl px-8 py-14 space-y-6">
            <div className="text-6xl">🔒</div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Registrations Closed</h3>
              <p className="text-zinc-400 text-base leading-relaxed">
                Online registrations are now closed. If you have already registered, you can check your pass below.
              </p>
            </div>
            <a href="/login"
              className="inline-block bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-8 py-3.5 rounded-xl text-base hover:from-yellow-500 hover:to-yellow-300 transition-all">
              Check My Pass →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// Keep RegistrationForm imported so the module resolves — used by admin
export { RegistrationForm }
