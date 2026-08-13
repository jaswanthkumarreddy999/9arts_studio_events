'use client'

import { useState, useEffect, useCallback } from 'react'
import { type EventSettings, type PassTierConfig, type AboutHighlight, type NavLink, type VoteCategory, DEFAULT_EVENT_SETTINGS } from '@/lib/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const inp = 'w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500'
const inpSm = 'bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500'
const label = 'block text-xs text-zinc-400 mb-1'

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors text-left">
        <span className="text-lg">{icon}</span>
        <span className="text-white font-semibold text-sm flex-1">{title}</span>
        <span className="text-zinc-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t border-white/10 p-5 space-y-4">{children}</div>}
    </div>
  )
}

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid gap-3 ${cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {children}
    </div>
  )
}

function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={label}>{lbl}</label>
      {children}
    </div>
  )
}

// ─── PassTierEditor ───────────────────────────────────────────────────────────

function PassTierEditor({ tiers, onChange }: {
  tiers: PassTierConfig[]
  onChange: (tiers: PassTierConfig[]) => void
}) {
  function update(i: number, field: keyof PassTierConfig, value: unknown) {
    const next = tiers.map((t, idx) => idx === i ? { ...t, [field]: value } : t)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {tiers.map((t, i) => (
        <div key={t.key} className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{t.badge}</span>
            <span className="text-white font-semibold text-sm">{t.label}</span>
            <span className="text-xs text-zinc-500 font-mono ml-1">key: {t.key}</span>
            <label className="ml-auto flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-zinc-400">Public booking open</span>
              <button
                type="button"
                onClick={() => update(i, 'closed', !t.closed)}
                className={`relative w-10 h-5 rounded-full transition-colors ${!t.closed ? 'bg-green-600' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${!t.closed ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className={label}>Label</label>
              <input value={t.label} onChange={e => update(i, 'label', e.target.value)} className={inpSm + ' w-full'} placeholder="Elite Pass" />
            </div>
            <div>
              <label className={label}>Badge (emoji)</label>
              <input value={t.badge} onChange={e => update(i, 'badge', e.target.value)} className={inpSm + ' w-full'} placeholder="👑" />
            </div>
            <div>
              <label className={label}>Price (₹)</label>
              <input type="number" value={t.price} onChange={e => update(i, 'price', Number(e.target.value))} className={inpSm + ' w-full'} />
            </div>
            <div>
              <label className={label}>Original Price (₹)</label>
              <input type="number" value={t.originalPrice} onChange={e => update(i, 'originalPrice', Number(e.target.value))} className={inpSm + ' w-full'} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className={label}>Subtitle</label>
              <input value={t.subtitle} onChange={e => update(i, 'subtitle', e.target.value)} className={inpSm + ' w-full'} placeholder="Premium Front Seats" />
            </div>
            <div>
              <label className={label}>Description</label>
              <input value={t.description} onChange={e => update(i, 'description', e.target.value)} className={inpSm + ' w-full'} placeholder="Best view..." />
            </div>
            <div>
              <label className={label}>Total Seats</label>
              <input type="number" value={t.totalSeats} onChange={e => update(i, 'totalSeats', Number(e.target.value))} className={inpSm + ' w-full'} />
            </div>
          </div>

          {t.closed && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
              🔒 This pass type is closed — not visible on the public registration form
            </div>
          )}
        </div>
      ))}
      <p className="text-zinc-600 text-xs">Pass keys (elite / gold) are fixed to match database constraints. You can change labels, prices, seat counts and open/closed status freely.</p>
    </div>
  )
}

// ─── HighlightsEditor ─────────────────────────────────────────────────────────

function HighlightsEditor({ highlights, onChange }: {
  highlights: AboutHighlight[]
  onChange: (h: AboutHighlight[]) => void
}) {
  function update(i: number, field: keyof AboutHighlight, val: string) {
    onChange(highlights.map((h, idx) => idx === i ? { ...h, [field]: val } : h))
  }
  function remove(i: number) { onChange(highlights.filter((_, idx) => idx !== i)) }
  function add() { onChange([...highlights, { icon: '⭐', title: 'New Item', desc: 'Description' }]) }

  return (
    <div className="space-y-2">
      {highlights.map((h, i) => (
        <div key={i} className="flex gap-2 items-start bg-black/20 border border-white/10 rounded-xl p-2">
          <input value={h.icon} onChange={e => update(i, 'icon', e.target.value)}
            className={inpSm + ' w-14 text-center'} placeholder="🏆" />
          <input value={h.title} onChange={e => update(i, 'title', e.target.value)}
            className={inpSm + ' w-32'} placeholder="Title" />
          <input value={h.desc} onChange={e => update(i, 'desc', e.target.value)}
            className={inpSm + ' flex-1'} placeholder="Description" />
          <button type="button" onClick={() => remove(i)}
            className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕</button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full border border-dashed border-white/20 hover:border-yellow-700/50 text-zinc-400 hover:text-yellow-400 py-2 rounded-xl text-xs transition-all">
        + Add Highlight
      </button>
    </div>
  )
}

// ─── NavLinksEditor ───────────────────────────────────────────────────────────

function NavLinksEditor({ links, onChange }: { links: NavLink[]; onChange: (l: NavLink[]) => void }) {
  function update(i: number, field: keyof NavLink, val: string) {
    onChange(links.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }
  function remove(i: number) { onChange(links.filter((_, idx) => idx !== i)) }
  function add() { onChange([...links, { href: '#section', label: 'Section' }]) }

  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex gap-2 items-center bg-black/20 border border-white/10 rounded-xl p-2">
          <input value={l.label} onChange={e => update(i, 'label', e.target.value)}
            className={inpSm + ' w-28'} placeholder="Home" />
          <input value={l.href} onChange={e => update(i, 'href', e.target.value)}
            className={inpSm + ' flex-1'} placeholder="#home" />
          <button type="button" onClick={() => remove(i)}
            className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕</button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full border border-dashed border-white/20 hover:border-yellow-700/50 text-zinc-400 hover:text-yellow-400 py-2 rounded-xl text-xs transition-all">
        + Add Nav Link
      </button>
    </div>
  )
}

// ─── VoteCategoriesEditor ─────────────────────────────────────────────────────

function VoteCategoriesEditor({ categories, onChange }: { categories: VoteCategory[]; onChange: (c: VoteCategory[]) => void }) {
  function update(i: number, field: keyof VoteCategory, val: string) {
    onChange(categories.map((c, idx) => idx === i ? { ...c, [field]: val } : c))
  }
  function remove(i: number) { onChange(categories.filter((_, idx) => idx !== i)) }
  function add() { onChange([...categories, { key: 'new', label: 'New Category', icon: '🌟' }]) }

  return (
    <div className="space-y-2">
      {categories.map((c, i) => (
        <div key={i} className="flex gap-2 items-center bg-black/20 border border-white/10 rounded-xl p-2">
          <input value={c.icon} onChange={e => update(i, 'icon', e.target.value)}
            className={inpSm + ' w-14 text-center'} placeholder="🌟" />
          <input value={c.key} onChange={e => update(i, 'key', e.target.value)}
            className={inpSm + ' w-24 font-mono'} placeholder="key" />
          <input value={c.label} onChange={e => update(i, 'label', e.target.value)}
            className={inpSm + ' flex-1'} placeholder="Category Name" />
          <button type="button" onClick={() => remove(i)}
            className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕</button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full border border-dashed border-white/20 hover:border-yellow-700/50 text-zinc-400 hover:text-yellow-400 py-2 rounded-xl text-xs transition-all">
        + Add Vote Category
      </button>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label: lbl }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-green-600' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className="text-sm text-zinc-300">{lbl}</span>
    </label>
  )
}

// ─── Main EventSettingsTab ────────────────────────────────────────────────────

export default function EventSettingsTab() {
  const [settings, setSettings] = useState<EventSettings>(DEFAULT_EVENT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/event-settings')
    if (res.ok) {
      const d = await res.json()
      if (d.settings) setSettings({ ...DEFAULT_EVENT_SETTINGS, ...d.settings })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  function set<K extends keyof EventSettings>(key: K, value: EventSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    const res = await fetch('/api/admin/event-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save settings')
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-zinc-500">Loading event settings…</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-20">

      {/* Save bar — sticky */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-white/10 -mx-4 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-white font-semibold text-sm">⚙️ Event Settings</div>
          <div className="text-zinc-500 text-xs">Changes go live instantly on the public site after saving.</div>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-400 text-xs">{error}</span>}
          {saved && <span className="text-green-400 text-xs">✅ Saved!</span>}
          <button onClick={handleSave} disabled={saving}
            className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
            {saving ? 'Saving…' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {/* ── BRANDING ── */}
      <Section title="Branding & Identity" icon="🎨">
        <Row>
          <Field label="Event Name *">
            <input value={settings.event_name} onChange={e => set('event_name', e.target.value)} className={inp} placeholder="Miss Nellore 2026" />
          </Field>
          <Field label="Edition / Year">
            <input value={settings.event_edition} onChange={e => set('event_edition', e.target.value)} className={inp} placeholder="2026" />
          </Field>
        </Row>
        <Row>
          <Field label="Event Tagline">
            <input value={settings.event_tagline} onChange={e => set('event_tagline', e.target.value)} className={inp} placeholder="An unforgettable experience" />
          </Field>
          <Field label="Organizer Name">
            <input value={settings.organizer_name} onChange={e => set('organizer_name', e.target.value)} className={inp} placeholder="9 Arts Studio" />
          </Field>
        </Row>
        <Field label="Event Icon (emoji shown in navbar & admin header)">
          <input value={settings.event_icon} onChange={e => set('event_icon', e.target.value)} className={inp + ' w-24'} placeholder="👑" />
        </Field>
      </Section>

      {/* ── DATE & VENUE ── */}
      <Section title="Date & Venue" icon="📅">
        <Row cols={3}>
          <Field label="Event Date (display text)">
            <input value={settings.event_date} onChange={e => set('event_date', e.target.value)} className={inp} placeholder="August 6, 2026" />
          </Field>
          <Field label="Day of Week">
            <input value={settings.event_day} onChange={e => set('event_day', e.target.value)} className={inp} placeholder="Sunday" />
          </Field>
          <Field label="Time">
            <input value={settings.event_time} onChange={e => set('event_time', e.target.value)} className={inp} placeholder="10:00 AM" />
          </Field>
        </Row>
        <Row>
          <Field label="Venue Name">
            <input value={settings.venue_name} onChange={e => set('venue_name', e.target.value)} className={inp} placeholder="DGP Kalyana Mandapam" />
          </Field>
          <Field label="Venue Address">
            <input value={settings.venue_address} onChange={e => set('venue_address', e.target.value)} className={inp} placeholder="Nellore, Andhra Pradesh" />
          </Field>
        </Row>
        <Field label="Google Maps URL">
          <input value={settings.venue_maps_url} onChange={e => set('venue_maps_url', e.target.value)} className={inp} placeholder="https://maps.app.goo.gl/..." />
        </Field>
      </Section>

      {/* ── CONTACT ── */}
      <Section title="Contact Information" icon="📞">
        <Row cols={3}>
          <Field label="Phone Number">
            <input value={settings.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inp} placeholder="9346039342" />
          </Field>
          <Field label="Email">
            <input value={settings.contact_email} onChange={e => set('contact_email', e.target.value)} className={inp} placeholder="9artsstudio@gmail.com" />
          </Field>
          <Field label="Instagram Handle (without @)">
            <input value={settings.contact_instagram} onChange={e => set('contact_instagram', e.target.value)} className={inp} placeholder="9artsstudio" />
          </Field>
        </Row>
      </Section>

      {/* ── SEO ── */}
      <Section title="SEO & Meta" icon="🔍">
        <Field label="Page Title (shown in browser tab)">
          <input value={settings.meta_title} onChange={e => set('meta_title', e.target.value)} className={inp} placeholder="9 Arts Studio — Event 2026" />
        </Field>
        <Field label="Meta Description (shown in Google search results)">
          <textarea value={settings.meta_description} onChange={e => set('meta_description', e.target.value)} rows={2}
            className={inp + ' resize-none'} placeholder="Register for the upcoming event by 9 Arts Studio, Nellore." />
        </Field>
      </Section>

      {/* ── PAYMENT ── */}
      <Section title="Payment Settings" icon="💳">
        <Row>
          <Field label="UPI ID">
            <input value={settings.upi_id} onChange={e => set('upi_id', e.target.value)} className={inp} placeholder="9346039342@ibl" />
          </Field>
          <Field label="Recipient Name (shown on payment screen)">
            <input value={settings.upi_name} onChange={e => set('upi_name', e.target.value)} className={inp} placeholder="9 Arts Studio" />
          </Field>
        </Row>
        <div className="bg-blue-900/10 border border-blue-700/20 rounded-xl px-4 py-3 text-xs text-blue-300">
          💡 Also update the <span className="font-mono font-semibold">NEXT_PUBLIC_UPI_ID</span> environment variable in your deployment to match.
          The UPI ID here is the source of truth for server-side payment confirmation.
        </div>
      </Section>

      {/* ── REGISTRATION ── */}
      <Section title="Registration Control" icon="🎟️">
        <Toggle
          value={settings.registrations_open}
          onChange={v => set('registrations_open', v)}
          label={settings.registrations_open ? '✅ Registrations are OPEN — public form is visible' : '🔒 Registrations are CLOSED — form is hidden'}
        />
        {!settings.registrations_open && (
          <Field label="Message shown when registrations are closed">
            <textarea value={settings.registrations_closed_message}
              onChange={e => set('registrations_closed_message', e.target.value)}
              rows={3} className={inp + ' resize-none'}
              placeholder="Online registrations are now closed…" />
          </Field>
        )}
      </Section>

      {/* ── PASS TIERS ── */}
      <Section title="Pass Types & Pricing" icon="🎫">
        <PassTierEditor
          tiers={settings.pass_tiers}
          onChange={v => set('pass_tiers', v)}
        />
      </Section>

      {/* ── SECTIONS VISIBILITY ── */}
      <Section title="Homepage Sections" icon="👁️">
        <div className="space-y-3">
          <Toggle value={settings.show_contestants} onChange={v => set('show_contestants', v)} label="Show Contestants section" />
          <Toggle value={settings.show_sponsors} onChange={v => set('show_sponsors', v)} label="Show Sponsors section" />
          <Toggle value={settings.show_voting} onChange={v => set('show_voting', v)} label="Enable voting for attendees" />
        </div>
      </Section>

      {/* ── HERO SECTION ── */}
      <Section title="Hero Section" icon="🌟">
        <Field label="Badge text (small label above the heading)">
          <input value={settings.hero_badge_text} onChange={e => set('hero_badge_text', e.target.value)} className={inp} placeholder="Nellore's Most Prestigious Event" />
        </Field>
        <Field label="Description paragraph">
          <textarea value={settings.hero_description} onChange={e => set('hero_description', e.target.value)} rows={3}
            className={inp + ' resize-none'} />
        </Field>
        <Row>
          <Field label="Primary CTA button text">
            <input value={settings.hero_cta_primary} onChange={e => set('hero_cta_primary', e.target.value)} className={inp} placeholder="Register Now" />
          </Field>
          <Field label="Secondary CTA button text">
            <input value={settings.hero_cta_secondary} onChange={e => set('hero_cta_secondary', e.target.value)} className={inp} placeholder="Learn More" />
          </Field>
        </Row>
        <Field label="Secondary CTA link (href)">
          <input value={settings.hero_cta_secondary_href} onChange={e => set('hero_cta_secondary_href', e.target.value)} className={inp} placeholder="#about or #contestants" />
        </Field>
      </Section>

      {/* ── ABOUT SECTION ── */}
      <Section title="About Section" icon="ℹ️">
        <Row>
          <Field label="Section subtitle (small text above heading)">
            <input value={settings.about_subtitle} onChange={e => set('about_subtitle', e.target.value)} className={inp} placeholder="About The Event" />
          </Field>
          <Field label="Section heading">
            <input value={settings.about_title} onChange={e => set('about_title', e.target.value)} className={inp} placeholder="A Event of Elegance & Grace" />
          </Field>
        </Row>
        <Field label="Description paragraph">
          <textarea value={settings.about_description} onChange={e => set('about_description', e.target.value)} rows={3}
            className={inp + ' resize-none'} />
        </Field>
        <Row>
          <Field label="Contestants stat label (e.g. 31+)">
            <input value={settings.stat_contestants_label} onChange={e => set('stat_contestants_label', e.target.value)} className={inp} placeholder="31+" />
          </Field>
          <Field label="Edition stat label (e.g. 1st)">
            <input value={settings.stat_edition_label} onChange={e => set('stat_edition_label', e.target.value)} className={inp} placeholder="1st" />
          </Field>
        </Row>
        <div>
          <label className={label + ' mb-2'}>Event Highlights (shown as cards in About section)</label>
          <HighlightsEditor highlights={settings.about_highlights} onChange={v => set('about_highlights', v)} />
        </div>
      </Section>

      {/* ── NAVBAR ── */}
      <Section title="Navigation Links" icon="🔗">
        <NavLinksEditor links={settings.nav_links} onChange={v => set('nav_links', v)} />
      </Section>

      {/* ── VOTE CATEGORIES ── */}
      <Section title="Vote Categories" icon="🗳️">
        <p className="text-zinc-500 text-xs mb-2">These define the voting categories shown in the public vote page and admin votes tab. Make sure contestant categories in the Contestants tab match these keys.</p>
        <VoteCategoriesEditor categories={settings.vote_categories} onChange={v => set('vote_categories', v)} />
      </Section>

      {/* Bottom save button */}
      <div className="flex justify-end gap-3 pt-2">
        {error && <span className="text-red-400 text-sm self-center">{error}</span>}
        {saved && <span className="text-green-400 text-sm self-center">✅ All changes saved!</span>}
        <button onClick={handleSave} disabled={saving}
          className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-8 py-3 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
          {saving ? 'Saving…' : '💾 Save All Changes'}
        </button>
      </div>
    </div>
  )
}
