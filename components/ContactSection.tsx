export default function ContactSection() {
  return (
    <section id="contact" className="py-16 sm:py-20 bg-black/70 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-10 items-start">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">👑</span>
              <span className="font-bold text-lg shimmer">Miss Nellore 2026</span>
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
                <span>📅</span> August 2, 2025
              </li>
              <li className="flex items-start gap-2">
                <span>⏰</span> 2:00 PM onwards
              </li>
              <li className="flex items-start gap-2">
                <span>📍</span>
                <a href="https://maps.app.goo.gl/wnjAFBDbuUUtRiLq8" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-colors">
                  DGP kalyana mandapam, Nellore, AP ↗
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li className="flex items-start gap-2">
                <span>📞</span> +91 9346039342
              </li>
              <li className="flex items-start gap-2">
                <span>📧</span> 9artsstudio@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-pink-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <a href="https://instagram.com/missnellore2026" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors">
                  @missnellore2026
                </a>
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
