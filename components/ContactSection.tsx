export default function ContactSection() {
  return (
    <section id="contact" className="py-16 sm:py-20 bg-black/70 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-10 items-start">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">👑</span>
              <span className="font-bold text-lg shimmer">Miss Nellore 2025</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              The most prestigious beauty pageant in Nellore, Andhra Pradesh. Celebrating beauty, talent, and grace.
            </p>
          </div>

          {/* Event info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Event Details</h4>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li className="flex items-start gap-2">
                <span>📅</span> December 15, 2025
              </li>
              <li className="flex items-start gap-2">
                <span>⏰</span> 6:00 PM onwards
              </li>
              <li className="flex items-start gap-2">
                <span>📍</span> Nellore Convention Center, Nellore, AP
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li className="flex items-start gap-2">
                <span>📞</span> +91 99999 XXXXX
              </li>
              <li className="flex items-start gap-2">
                <span>📧</span> missnellore2025@gmail.com
              </li>
              <li className="flex items-start gap-2">
                <span>📸</span> @missnellore2025
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 text-center text-zinc-600 text-xs">
          © 2025 Miss Nellore Events. All rights reserved.
        </div>
      </div>
    </section>
  )
}
