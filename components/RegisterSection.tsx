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
        <RegistrationForm />
      </div>
    </section>
  )
}
