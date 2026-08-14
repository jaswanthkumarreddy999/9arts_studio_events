'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { type EventSettings, DEFAULT_EVENT_SETTINGS } from '@/lib/types'

export default function Navbar({ settings: propSettings }: { settings?: EventSettings }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // Use prop settings (from server) or fall back to defaults
  const s = propSettings ?? DEFAULT_EVENT_SETTINGS

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/90 backdrop-blur-md border-b border-yellow-900/30 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-2 group">
          <span className="text-2xl">{s.event_icon}</span>
          <span className="font-bold text-lg shimmer">{s.event_name}</span>
          {s.event_edition && (
            <span className="text-yellow-600 text-sm font-medium ml-1">{s.event_edition}</span>
          )}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {s.nav_links
            .filter(l => l.href !== '#contestants' || s.show_contestants)
            .map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-zinc-300 hover:text-yellow-400 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-300 hover:text-yellow-400 transition-colors px-3 py-2"
          >
            My Pass
          </Link>
          <a
            href="#register"
            className="text-sm font-semibold bg-gradient-to-r from-yellow-600 to-yellow-400 text-black px-5 py-2 rounded-full hover:from-yellow-500 hover:to-yellow-300 transition-all"
          >
            {s.hero_cta_primary}
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-yellow-900/30">
          <nav className="flex flex-col px-4 py-4 gap-1">
            {s.nav_links
              .filter(l => l.href !== '#contestants' || s.show_contestants)
              .map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-base font-medium text-zinc-300 hover:text-yellow-400 py-3 border-b border-zinc-800 transition-colors"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              className="text-base font-medium text-zinc-300 hover:text-yellow-400 py-3 border-b border-zinc-800 transition-colors"
              onClick={() => setOpen(false)}
            >
              My Pass
            </Link>
            <a
              href="#register"
              className="mt-3 text-center font-semibold bg-gradient-to-r from-yellow-600 to-yellow-400 text-black px-5 py-3 rounded-full"
              onClick={() => setOpen(false)}
            >
              {s.hero_cta_primary}
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
