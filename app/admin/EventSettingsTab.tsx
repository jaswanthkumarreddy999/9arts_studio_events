'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type EventSettings, type PassTierConfig, type AboutHighlight,
  type NavLink, type VoteCategory, type CustomSection, type CustomField,
  type AdminTabConfig, DEFAULT_EVENT_SETTINGS,
} from '@/lib/types'
import { nanoid } from '@/lib/nanoid'

// ─── helpers ─────────────────────────────────────────────────────────────────

const inp = 'w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 transition-colors'
const inpSm = 'bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500 transition-colors'
const lbl = 'block text-xs text-zinc-400 mb-1'

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
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
  const cls = cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
  return <div className={`grid gap-3 ${cls}`}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={lbl}>{label}</label>{children}</div>
}

function Toggle({ value, onChange, label: text }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button type="button" onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-green-600' : 'bg-zinc-700'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className="text-sm text-zinc-300">{text}</span>
    </label>
  )
}

// ─── PassTierEditor ───────────────────────────────────────────────────────────
function PassTierEditor({ tiers, onChange }: { tiers: PassTierConfig[]; onChange: (v: PassTierConfig[]) => void }) {
  function update(i: number, field: keyof PassTierConfig, value: unknown) {
    onChange(tiers.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }
  return (
    <div className="space-y-4">
      {tiers.map((t, i) => (
        <div key={t.key} className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{t.badge}</span>
            <span className="text-white font-semibold text-sm">{t.label}</span>
            <span className="text-xs text-zinc-500 font-mono ml-1">key: {t.key}</span>
            <label className="ml-auto flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-zinc-400">Public booking open</span>
              <button type="button" onClick={() => update(i, 'closed', !t.closed)}
                className={`relative w-10 h-5 rounded-full transition-colors ${!t.closed ? 'bg-green-600' : 'bg-zinc-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${!t.closed ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><label className={lbl}>Label</label><input value={t.label} onChange={e => update(i, 'label', e.target.value)} className={inpSm + ' w-full'} /></div>
            <div><label className={lbl}>Badge</label><input value={t.badge} onChange={e => update(i, 'badge', e.target.value)} className={inpSm + ' w-full'} /></div>
            <div><label className={lbl}>Price (₹)</label><input type="number" value={t.price} onChange={e => update(i, 'price', Number(e.target.value))} className={inpSm + ' w-full'} /></div>
            <div><label className={lbl}>Original (₹)</label><input type="number" value={t.originalPrice} onChange={e => update(i, 'originalPrice', Number(e.target.value))} className={inpSm + ' w-full'} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div><label className={lbl}>Subtitle</label><input value={t.subtitle} onChange={e => update(i, 'subtitle', e.target.value)} className={inpSm + ' w-full'} /></div>
            <div><label className={lbl}>Description</label><input value={t.description} onChange={e => update(i, 'description', e.target.value)} className={inpSm + ' w-full'} /></div>
            <div><label className={lbl}>Total Seats</label><input type="number" value={t.totalSeats} onChange={e => update(i, 'totalSeats', Number(e.target.value))} className={inpSm + ' w-full'} /></div>
          </div>
          {t.closed && <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">🔒 Closed — not visible on the public registration form</div>}
        </div>
      ))}
      <p className="text-zinc-600 text-xs">Pass keys (elite / gold) are fixed to match database constraints.</p>
    </div>
  )
}

// ─── HighlightsEditor ─────────────────────────────────────────────────────────
function HighlightsEditor({ highlights, onChange }: { highlights: AboutHighlight[]; onChange: (v: AboutHighlight[]) => void }) {
  return (
    <div className="space-y-2">
      {highlights.map((h, i) => (
        <div key={i} className="flex gap-2 items-start bg-black/20 border border-white/10 rounded-xl p-2">
          <input value={h.icon} onChange={e => onChange(highlights.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} className={inpSm + ' w-14 text-center'} placeholder="🏆" />
          <input value={h.title} onChange={e => onChange(highlights.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className={inpSm + ' w-32'} placeholder="Title" />
          <input value={h.desc} onChange={e => onChange(highlights.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} className={inpSm + ' flex-1'} placeholder="Description" />
          <button type="button" onClick={() => onChange(highlights.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...highlights, { icon: '⭐', title: 'New Item', desc: 'Description' }])}
        className="w-full border border-dashed border-white/20 hover:border-yellow-700/50 text-zinc-400 hover:text-yellow-400 py-2 rounded-xl text-xs transition-all">
        + Add Highlight
      </button>
    </div>
  )
}

// ─── NavLinksEditor ───────────────────────────────────────────────────────────
function NavLinksEditor({ links, onChange }: { links: NavLink[]; onChange: (v: NavLink[]) => void }) {
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex gap-2 items-center bg-black/20 border border-white/10 rounded-xl p-2">
          <input value={l.label} onChange={e => onChange(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className={inpSm + ' w-28'} placeholder="Home" />
          <input value={l.href} onChange={e => onChange(links.map((x, j) => j === i ? { ...x, href: e.target.value } : x))} className={inpSm + ' flex-1'} placeholder="#home" />
          <button type="button" onClick={() => onChange(links.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...links, { href: '#section', label: 'Section' }])}
        className="w-full border border-dashed border-white/20 hover:border-yellow-700/50 text-zinc-400 hover:text-yellow-400 py-2 rounded-xl text-xs transition-all">
        + Add Nav Link
      </button>
    </div>
  )
}

// ─── VoteCategoriesEditor ─────────────────────────────────────────────────────
function VoteCategoriesEditor({ categories, onChange }: { categories: VoteCategory[]; onChange: (v: VoteCategory[]) => void }) {
  return (
    <div className="space-y-2">
      {categories.map((c, i) => (
        <div key={i} className="flex gap-2 items-center bg-black/20 border border-white/10 rounded-xl p-2">
          <input value={c.icon} onChange={e => onChange(categories.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} className={inpSm + ' w-14 text-center'} placeholder="🌟" />
          <input value={c.key} onChange={e => onChange(categories.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} className={inpSm + ' w-24 font-mono'} placeholder="key" />
          <input value={c.label} onChange={e => onChange(categories.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className={inpSm + ' flex-1'} placeholder="Category Name" />
          <button type="button" onClick={() => onChange(categories.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...categories, { key: 'new', label: 'New Category', icon: '🌟' }])}
        className="w-full border border-dashed border-white/20 hover:border-yellow-700/50 text-zinc-400 hover:text-yellow-400 py-2 rounded-xl text-xs transition-all">
        + Add Vote Category
      </button>
    </div>
  )
}

// ─── BgImageField ─────────────────────────────────────────────────────────────
function BgImageField({ label: text, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={lbl}>{text}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className={inp} placeholder="https://... or leave empty for default dark gradient" />
      {value && (
        <div className="mt-2 relative h-20 rounded-xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <button type="button" onClick={() => onChange('')} className="absolute top-1.5 right-1.5 bg-black/70 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-900/80 transition-colors">✕ Clear</button>
        </div>
      )}
    </div>
  )
}

// ─── CustomSectionsEditor ─────────────────────────────────────────────────────
function CustomSectionsEditor({ sections, onChange }: { sections: CustomSection[]; onChange: (v: CustomSection[]) => void }) {
  function update(id: string, field: keyof CustomSection, value: unknown) {
    onChange(sections.map(s => s.id === id ? { ...s, [field]: value } : s))
  }
  function remove(id: string) { onChange(sections.filter(s => s.id !== id)) }
  function add() {
    const id = nanoid()
    onChange([...sections, { id, title: 'New Section', subtitle: 'Section', content: 'Add your content here.', bg_image: '', bg_color: '#0a0a0f', visible: true, display_order: sections.length }])
  }

  return (
    <div className="space-y-4">
      <p className="text-zinc-500 text-xs">These custom sections appear on the homepage between the fixed sections. Use them for schedules, galleries, announcements, etc.</p>
      {sections.map((s) => (
        <div key={s.id} className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input value={s.title} onChange={e => update(s.id, 'title', e.target.value)} className={inpSm + ' flex-1 font-semibold'} placeholder="Section Title" />
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
              <button type="button" onClick={() => update(s.id, 'visible', !s.visible)}
                className={`relative w-9 h-5 rounded-full transition-colors ${s.visible ? 'bg-green-600' : 'bg-zinc-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-zinc-400">{s.visible ? 'Visible' : 'Hidden'}</span>
            </label>
            <button type="button" onClick={() => remove(s.id)} className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕ Remove</button>
          </div>
          <Row>
            <div><label className={lbl}>Subtitle (small label above heading)</label>
              <input value={s.subtitle} onChange={e => update(s.id, 'subtitle', e.target.value)} className={inpSm + ' w-full'} placeholder="Subtitle" /></div>
            <div><label className={lbl}>Display Order</label>
              <input type="number" value={s.display_order} onChange={e => update(s.id, 'display_order', Number(e.target.value))} className={inpSm + ' w-full'} /></div>
          </Row>
          <div><label className={lbl}>Content / Description</label>
            <textarea value={s.content} onChange={e => update(s.id, 'content', e.target.value)} rows={3} className={inp + ' resize-none text-sm'} placeholder="Section content..." /></div>
          <BgImageField label="Background Image URL" value={s.bg_image} onChange={v => update(s.id, 'bg_image', v)} />
          <div><label className={lbl}>Fallback Background Color (if no image)</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={s.bg_color || '#0a0a0f'} onChange={e => update(s.id, 'bg_color', e.target.value)} className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <input value={s.bg_color} onChange={e => update(s.id, 'bg_color', e.target.value)} className={inpSm + ' flex-1'} placeholder="#0a0a0f" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full border border-dashed border-yellow-700/40 hover:border-yellow-600 text-yellow-500 hover:text-yellow-300 py-3 rounded-xl text-sm font-medium transition-all">
        + Add Custom Section
      </button>
    </div>
  )
}

// ─── CustomFieldsEditor ───────────────────────────────────────────────────────
const FIELD_TYPES = ['text', 'number', 'select', 'textarea'] as const

function CustomFieldsEditor({ fields, onChange }: { fields: CustomField[]; onChange: (v: CustomField[]) => void }) {
  function update(id: string, key: keyof CustomField, value: unknown) {
    onChange(fields.map(f => f.id === id ? { ...f, [key]: value } : f))
  }
  function remove(id: string) { onChange(fields.filter(f => f.id !== id)) }
  function add() {
    onChange([...fields, { id: nanoid(), label: 'Custom Field', type: 'text', placeholder: '', required: false, options: [] }])
  }

  return (
    <div className="space-y-4">
      <p className="text-zinc-500 text-xs">Extra fields added to the registration form. Responses are saved per-registration in the database.</p>
      {fields.map((f) => (
        <div key={f.id} className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <input value={f.label} onChange={e => update(f.id, 'label', e.target.value)} className={inpSm + ' flex-1'} placeholder="Field Label (e.g. School Name)" />
            <select value={f.type} onChange={e => update(f.id, 'type', e.target.value)}
              className={inpSm}>
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-xs text-zinc-400">
              <input type="checkbox" checked={f.required} onChange={e => update(f.id, 'required', e.target.checked)} className="accent-yellow-500" />
              Required
            </label>
            <button type="button" onClick={() => remove(f.id)} className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1.5 rounded border border-red-700/30 hover:bg-red-900/20 transition-colors shrink-0">✕</button>
          </div>
          <input value={f.placeholder} onChange={e => update(f.id, 'placeholder', e.target.value)} className={inpSm + ' w-full'} placeholder="Placeholder text shown to user" />
          {f.type === 'select' && (
            <div>
              <label className={lbl}>Options (one per line)</label>
              <textarea
                value={f.options.join('\n')}
                onChange={e => update(f.id, 'options', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                rows={3} className={inp + ' resize-none text-sm font-mono'}
                placeholder="Option 1&#10;Option 2&#10;Option 3" />
            </div>
          )}
          <div className="text-xs text-zinc-600 font-mono">field id: {f.id}</div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full border border-dashed border-yellow-700/40 hover:border-yellow-600 text-yellow-500 hover:text-yellow-300 py-3 rounded-xl text-sm font-medium transition-all">
        + Add Custom Field
      </button>
    </div>
  )
}

// ─── AdminTabsEditor ──────────────────────────────────────────────────────────
const TAB_INFO: Record<string, { label: string; icon: string }> = {
  registrations: { label: 'Registrations', icon: '🎟️' },
  contestants:   { label: 'Contestants',   icon: '👸' },
  sponsors:      { label: 'Sponsors',      icon: '🤝' },
  seating:       { label: 'Seating',       icon: '🪑' },
  scanhistory:   { label: 'Scan History',  icon: '📋' },
  votes:         { label: 'Votes',         icon: '🗳️' },
  register:      { label: 'Register',      icon: '➕' },
  settings:      { label: 'Settings',      icon: '⚙️' },
}

function AdminTabsEditor({ tabs, onChange }: { tabs: AdminTabConfig[]; onChange: (v: AdminTabConfig[]) => void }) {
  // Ensure all known tabs are present
  const allTabs = Object.keys(TAB_INFO).map(key => {
    const existing = tabs.find(t => t.key === key)
    return existing ?? { key, visible: true }
  })

  function toggle(key: string) {
    if (key === 'settings') return // settings tab can't be hidden
    onChange(allTabs.map(t => t.key === key ? { ...t, visible: !t.visible } : t))
  }

  return (
    <div className="space-y-2">
      <p className="text-zinc-500 text-xs mb-3">Show or hide admin dashboard tabs. The Settings tab is always visible.</p>
      <div className="grid grid-cols-2 gap-2">
        {allTabs.map(t => {
          const info = TAB_INFO[t.key] ?? { label: t.key, icon: '📌' }
          const isSettings = t.key === 'settings'
          return (
            <button key={t.key} type="button" onClick={() => toggle(t.key)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-all ${t.visible ? 'border-green-700/50 bg-green-900/10 text-green-300' : 'border-zinc-700/50 bg-zinc-900/30 text-zinc-500'} ${isSettings ? 'opacity-60 cursor-not-allowed' : 'hover:border-yellow-700/50 hover:text-yellow-300 cursor-pointer'}`}>
              <span className="text-lg">{info.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{info.label}</div>
                <div className="text-xs">{t.visible ? 'Visible' : 'Hidden'}{isSettings ? ' (always on)' : ''}</div>
              </div>
              <div className={`w-2 h-2 rounded-full shrink-0 ${t.visible ? 'bg-green-400' : 'bg-zinc-600'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── NewEventWipe ─────────────────────────────────────────────────────────────
function NewEventWipe() {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'wiping' | 'done' | 'error'>('idle')
  const [keepContestants, setKeepContestants] = useState(false)
  const [keepSponsors, setKeepSponsors] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [typed, setTyped] = useState('')

  async function doWipe() {
    if (typed !== 'WIPE ALL DATA') return
    setPhase('wiping')
    try {
      const res = await fetch('/api/admin/wipe-event-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: 'WIPE ALL DATA',
          keep_contestants: keepContestants,
          keep_sponsors: keepSponsors,
        }),
      })
      const d = await res.json()
      if (!res.ok || res.status === 207) {
        // Show the actual error details so we know what failed
        const detail = d.errors ? `Failed tables: ${(d.errors as string[]).join('; ')}` : (d.error ?? 'Wipe failed')
        setErrorMsg(detail)
        setPhase('error')
      } else {
        setPhase('done')
        setTyped('')
        // Reload the page so all tabs re-fetch from the now-empty database
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-5 text-center space-y-3">
        <div className="text-2xl">✅</div>
        <div className="text-green-300 font-semibold">Event data wiped successfully</div>
        <p className="text-green-400/70 text-sm">All registrations, payments, passes, votes, and scan logs cleared. Admin accounts and event settings preserved.</p>
        <p className="text-green-400/50 text-xs">Reloading page…</p>
        <button onClick={() => setPhase('idle')} className="text-xs text-zinc-400 hover:text-white underline">Reset</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-900/10 border border-red-700/30 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <span className="text-xl">⚠️</span> Danger Zone — New Event Reset
        </div>
        <p className="text-red-300/70 text-xs leading-relaxed">
          This permanently deletes <strong>all registrations, payments, passes, votes, vote adjustments, and scan logs</strong>.
          Admin accounts and all event settings are preserved.
          Use this to reset the platform for a fresh event cycle.
        </p>
      </div>

      {phase === 'idle' && (
        <button onClick={() => setPhase('confirm')}
          className="w-full border border-red-700/50 text-red-400 hover:bg-red-900/20 py-3 rounded-xl text-sm font-semibold transition-all">
          🗑️ Prepare to Wipe Event Data
        </button>
      )}

      {(phase === 'confirm' || phase === 'error' || phase === 'wiping') && (
        <div className="space-y-4 bg-black/30 border border-red-700/40 rounded-xl p-5">
          <div className="text-sm text-red-300 font-semibold">What to keep?</div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
              <input type="checkbox" checked={keepContestants} onChange={e => setKeepContestants(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
              Keep Contestants
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
              <input type="checkbox" checked={keepSponsors} onChange={e => setKeepSponsors(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
              Keep Sponsors
            </label>
          </div>
          <div>
            <label className={lbl + ' text-red-400'}>Type <span className="font-mono font-bold text-white">WIPE ALL DATA</span> to confirm</label>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              className={inp + ' border-red-700/50 focus:border-red-500 font-mono'}
              placeholder="WIPE ALL DATA"
              autoComplete="off"
            />
          </div>
          {errorMsg && <div className="text-red-400 text-xs bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">{errorMsg}</div>}
          <div className="flex gap-3">
            <button onClick={() => { setPhase('idle'); setTyped(''); setErrorMsg('') }}
              className="flex-1 border border-white/10 text-zinc-400 hover:text-white py-2.5 rounded-xl text-sm transition-all">
              Cancel
            </button>
            <button
              onClick={doWipe}
              disabled={typed !== 'WIPE ALL DATA' || phase === 'wiping'}
              className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition-all">
              {phase === 'wiping' ? '⏳ Wiping…' : '🗑️ Confirm Wipe'}
            </button>
          </div>
        </div>
      )}
    </div>
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
    setSaving(true); setError(''); setSaved(false)
    const res = await fetch('/api/admin/event-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await res.json(); setError(d.error ?? 'Failed to save') }
  }

  if (loading) return <div className="text-center py-16 text-zinc-500">Loading event settings…</div>

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-20">

      {/* Sticky save bar */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-white/10 -mx-4 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-white font-semibold text-sm">⚙️ Event Settings</div>
          <div className="text-zinc-500 text-xs">Changes go live on the public site after saving.</div>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-400 text-xs max-w-xs truncate">{error}</span>}
          {saved && <span className="text-green-400 text-xs">✅ Saved!</span>}
          <button onClick={handleSave} disabled={saving}
            className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
            {saving ? 'Saving…' : '💾 Save All'}
          </button>
        </div>
      </div>

      {/* ── BRANDING ─────────────────────────────────────────────────────── */}
      <Section title="Branding & Identity" icon="🎨">
        <Row>
          <Field label="Event Name *">
            <input value={settings.event_name} onChange={e => set('event_name', e.target.value)} className={inp} placeholder="9 Arts Studio Event" />
          </Field>
          <Field label="Edition / Year">
            <input value={settings.event_edition} onChange={e => set('event_edition', e.target.value)} className={inp} placeholder="2026" />
          </Field>
        </Row>
        <Row>
          <Field label="Event Tagline">
            <input value={settings.event_tagline} onChange={e => set('event_tagline', e.target.value)} className={inp} />
          </Field>
          <Field label="Organizer Name">
            <input value={settings.organizer_name} onChange={e => set('organizer_name', e.target.value)} className={inp} />
          </Field>
        </Row>
        <Row>
          <Field label="Event Icon (emoji)">
            <input value={settings.event_icon} onChange={e => set('event_icon', e.target.value)} className={inp + ' w-24'} placeholder="🎭" />
          </Field>
          <Field label="Application ID Prefix (e.g. 9AS → 9AS2026-XXXX)">
            <input value={settings.app_id_prefix} onChange={e => set('app_id_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} className={inp + ' font-mono'} placeholder="9AS" maxLength={6} />
          </Field>
        </Row>
      </Section>

      {/* ── DATE & VENUE ─────────────────────────────────────────────────── */}
      <Section title="Date & Venue" icon="📅">
        <Row cols={3}>
          <Field label="Event Date"><input value={settings.event_date} onChange={e => set('event_date', e.target.value)} className={inp} placeholder="August 6, 2026" /></Field>
          <Field label="Day of Week"><input value={settings.event_day} onChange={e => set('event_day', e.target.value)} className={inp} placeholder="Sunday" /></Field>
          <Field label="Time"><input value={settings.event_time} onChange={e => set('event_time', e.target.value)} className={inp} placeholder="10:00 AM" /></Field>
        </Row>
        <Row>
          <Field label="Venue Name"><input value={settings.venue_name} onChange={e => set('venue_name', e.target.value)} className={inp} /></Field>
          <Field label="Venue Address"><input value={settings.venue_address} onChange={e => set('venue_address', e.target.value)} className={inp} /></Field>
        </Row>
        <Field label="Google Maps URL"><input value={settings.venue_maps_url} onChange={e => set('venue_maps_url', e.target.value)} className={inp} placeholder="https://maps.app.goo.gl/..." /></Field>
      </Section>

      {/* ── CONTACT ──────────────────────────────────────────────────────── */}
      <Section title="Contact Information" icon="📞">
        <Row cols={3}>
          <Field label="Phone"><input value={settings.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inp} /></Field>
          <Field label="Email"><input value={settings.contact_email} onChange={e => set('contact_email', e.target.value)} className={inp} /></Field>
          <Field label="Instagram (without @)"><input value={settings.contact_instagram} onChange={e => set('contact_instagram', e.target.value)} className={inp} /></Field>
        </Row>
      </Section>

      {/* ── SEO ──────────────────────────────────────────────────────────── */}
      <Section title="SEO & Meta" icon="🔍" defaultOpen={false}>
        <Field label="Page Title (browser tab)"><input value={settings.meta_title} onChange={e => set('meta_title', e.target.value)} className={inp} /></Field>
        <Field label="Meta Description">
          <textarea value={settings.meta_description} onChange={e => set('meta_description', e.target.value)} rows={2} className={inp + ' resize-none'} />
        </Field>
      </Section>

      {/* ── PAYMENT ──────────────────────────────────────────────────────── */}
      <Section title="Payment Settings" icon="💳">
        <Row>
          <Field label="UPI ID"><input value={settings.upi_id} onChange={e => set('upi_id', e.target.value)} className={inp} /></Field>
          <Field label="Recipient Name"><input value={settings.upi_name} onChange={e => set('upi_name', e.target.value)} className={inp} /></Field>
        </Row>
      </Section>

      {/* ── REGISTRATION ─────────────────────────────────────────────────── */}
      <Section title="Registration Control" icon="🎟️">
        <Toggle value={settings.registrations_open} onChange={v => set('registrations_open', v)}
          label={settings.registrations_open ? '✅ Registrations OPEN — form visible to public' : '🔒 Registrations CLOSED — form hidden'} />
        {!settings.registrations_open && (
          <Field label="Message shown when closed">
            <textarea value={settings.registrations_closed_message} onChange={e => set('registrations_closed_message', e.target.value)}
              rows={3} className={inp + ' resize-none'} />
          </Field>
        )}
      </Section>

      {/* ── PASS TIERS ───────────────────────────────────────────────────── */}
      <Section title="Pass Types & Pricing" icon="🎫">
        <PassTierEditor tiers={settings.pass_tiers} onChange={v => set('pass_tiers', v)} />
      </Section>

      {/* ── HOMEPAGE SECTIONS VISIBILITY ─────────────────────────────────── */}
      <Section title="Homepage Sections" icon="👁️">
        <div className="space-y-3">
          <Toggle value={settings.show_contestants} onChange={v => set('show_contestants', v)} label="Show Contestants section" />
          <Toggle value={settings.show_sponsors} onChange={v => set('show_sponsors', v)} label="Show Sponsors section" />
          <Toggle value={settings.show_voting} onChange={v => set('show_voting', v)} label="Enable voting for attendees" />
        </div>
        <div className="pt-1">
          <label className={lbl + ' mb-1'}>Contestants section description (optional)</label>
          <input value={settings.contestants_description} onChange={e => set('contestants_description', e.target.value)}
            className={inp} placeholder="Leave blank to auto-generate from event name" />
        </div>
        <div>
          <label className={lbl + ' mb-1'}>Sponsors section description (optional)</label>
          <input value={settings.sponsors_description} onChange={e => set('sponsors_description', e.target.value)}
            className={inp} placeholder="Leave blank to auto-generate from event name" />
        </div>
      </Section>

      {/* ── BACKGROUND IMAGES ────────────────────────────────────────────── */}
      <Section title="Section Background Images" icon="🖼️" defaultOpen={false}>
        <p className="text-zinc-500 text-xs">Paste a direct image URL for each section. Leave blank to use the default dark gradient.</p>
        <BgImageField label="Hero section background" value={settings.hero_bg_image} onChange={v => set('hero_bg_image', v)} />
        <BgImageField label="About section background" value={settings.about_bg_image} onChange={v => set('about_bg_image', v)} />
        <BgImageField label="Contestants section background" value={settings.contestants_bg_image} onChange={v => set('contestants_bg_image', v)} />
        <BgImageField label="Sponsors section background" value={settings.sponsors_bg_image} onChange={v => set('sponsors_bg_image', v)} />
        <BgImageField label="Register section background" value={settings.register_bg_image} onChange={v => set('register_bg_image', v)} />
        <BgImageField label="Contact / Footer section background" value={settings.contact_bg_image} onChange={v => set('contact_bg_image', v)} />
      </Section>

      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <Section title="Hero Section Content" icon="🌟" defaultOpen={false}>
        <Field label="Badge text (small label above the heading)">
          <input value={settings.hero_badge_text} onChange={e => set('hero_badge_text', e.target.value)} className={inp} />
        </Field>
        <Field label="Description paragraph">
          <textarea value={settings.hero_description} onChange={e => set('hero_description', e.target.value)} rows={3} className={inp + ' resize-none'} />
        </Field>
        <Row>
          <Field label="Primary CTA button text">
            <input value={settings.hero_cta_primary} onChange={e => set('hero_cta_primary', e.target.value)} className={inp} placeholder="Register Now" />
          </Field>
          <Field label="Secondary CTA button text">
            <input value={settings.hero_cta_secondary} onChange={e => set('hero_cta_secondary', e.target.value)} className={inp} placeholder="Learn More" />
          </Field>
        </Row>
        <Field label="Secondary CTA link">
          <input value={settings.hero_cta_secondary_href} onChange={e => set('hero_cta_secondary_href', e.target.value)} className={inp} placeholder="#about" />
        </Field>
      </Section>

      {/* ── ABOUT SECTION ────────────────────────────────────────────────── */}
      <Section title="About Section Content" icon="ℹ️" defaultOpen={false}>
        <Row>
          <Field label="Section subtitle"><input value={settings.about_subtitle} onChange={e => set('about_subtitle', e.target.value)} className={inp} /></Field>
          <Field label="Section heading"><input value={settings.about_title} onChange={e => set('about_title', e.target.value)} className={inp} /></Field>
        </Row>
        <Field label="Description paragraph">
          <textarea value={settings.about_description} onChange={e => set('about_description', e.target.value)} rows={3} className={inp + ' resize-none'} />
        </Field>
        <Row>
          <Field label="Contestants stat label"><input value={settings.stat_contestants_label} onChange={e => set('stat_contestants_label', e.target.value)} className={inp} placeholder="31+" /></Field>
          <Field label="Edition stat label"><input value={settings.stat_edition_label} onChange={e => set('stat_edition_label', e.target.value)} className={inp} placeholder="1st" /></Field>
        </Row>
        <div>
          <label className={lbl + ' mb-2'}>Event Highlights</label>
          <HighlightsEditor highlights={settings.about_highlights} onChange={v => set('about_highlights', v)} />
        </div>
      </Section>

      {/* ── NAVIGATION ───────────────────────────────────────────────────── */}
      <Section title="Navigation Links" icon="🔗" defaultOpen={false}>
        <NavLinksEditor links={settings.nav_links} onChange={v => set('nav_links', v)} />
      </Section>

      {/* ── VOTE CATEGORIES ──────────────────────────────────────────────── */}
      <Section title="Vote Categories" icon="🗳️" defaultOpen={false}>
        <p className="text-zinc-500 text-xs mb-2">Keys must match the contestant_category values used in the Contestants tab.</p>
        <VoteCategoriesEditor categories={settings.vote_categories} onChange={v => set('vote_categories', v)} />
      </Section>

      {/* ── CUSTOM SECTIONS ──────────────────────────────────────────────── */}
      <Section title="Custom Homepage Sections" icon="📄" defaultOpen={false}>
        <CustomSectionsEditor sections={settings.custom_sections ?? []} onChange={v => set('custom_sections', v)} />
      </Section>

      {/* ── CUSTOM REGISTRATION FIELDS ───────────────────────────────────── */}
      <Section title="Custom Registration Fields" icon="📝" defaultOpen={false}>
        <CustomFieldsEditor fields={settings.custom_fields ?? []} onChange={v => set('custom_fields', v)} />
      </Section>

      {/* ── ADMIN TAB VISIBILITY ─────────────────────────────────────────── */}
      <Section title="Admin Dashboard Tabs" icon="🗂️" defaultOpen={false}>
        <AdminTabsEditor tabs={settings.admin_tabs ?? []} onChange={v => set('admin_tabs', v)} />
      </Section>

      {/* ── NEW EVENT WIPE ───────────────────────────────────────────────── */}
      <Section title="New Event — Reset Data" icon="🔁" defaultOpen={false}>
        <NewEventWipe />
      </Section>

      {/* Bottom save */}
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
