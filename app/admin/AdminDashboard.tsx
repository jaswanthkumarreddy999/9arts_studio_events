'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SEAT_TIERS } from '@/lib/types'
import Link from 'next/link'

type PaymentStatus = 'pending' | 'approved' | 'rejected'
type AdminTab = 'registrations' | 'contestants' | 'votes'

interface RegRow {
  application_id: string
  full_name: string
  mobile: string
  email?: string
  age?: number
  address?: string
  seat_tier: string
  created_at: string
  payments: {
    status: PaymentStatus
    utr_number?: string
    screenshot_path?: string
    submitted_at?: string
    rejection_reason?: string
    verified_at?: string
    amount?: number
  } | null
}

interface Contestant {
  id: string
  name: string
  tagline?: string
  bio?: string
  photo_url?: string
  category?: string
  display_order: number
}

interface VoteResult {
  contestantId: string
  name: string
  category: string | null
  photo_url: string | null
  count: number
}

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>('registrations')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Top bar */}
      <header className="bg-black/60 border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">👑</span>
            <div>
              <div className="font-bold text-white text-sm">Miss Nellore 2026 — Admin</div>
              <div className="text-zinc-500 text-xs">Welcome, {adminName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/scan" className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors hidden sm:block">
              📷 Scanner
            </Link>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Logout</button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {(['registrations', 'contestants', 'votes'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all capitalize ${
                activeTab === tab
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              {tab === 'registrations' ? '🎟️ Registrations' : tab === 'contestants' ? '👸 Contestants' : '🗳️ Votes'}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'registrations' && <RegistrationsTab />}
        {activeTab === 'contestants' && <ContestantsTab />}
        {activeTab === 'votes' && <VotesTab />}
      </div>
    </div>
  )
}

// ─── REGISTRATIONS TAB ────────────────────────────────────────────────────────

function RegistrationsTab() {
  const [rows, setRows] = useState<RegRow[]>([])
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all')
  const [selected, setSelected] = useState<RegRow | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/registrations')
    if (res.ok) {
      const data = await res.json()
      setRows(data.registrations)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  async function openDetail(row: RegRow) {
    setSelected(row)
    setNote('')
    setScreenshotUrl('')
    if (row.payments?.screenshot_path) {
      const res = await fetch('/api/admin/screenshot-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: row.payments.screenshot_path }),
      })
      if (res.ok) {
        const data = await res.json()
        setScreenshotUrl(data.url)
      }
    }
  }

  async function handleVerify(action: 'approve' | 'reject') {
    if (!selected) return
    setActionLoading(true)
    const res = await fetch('/api/admin/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: selected.application_id, action, note }),
    })
    if (res.ok) {
      setSelected(null)
      await fetchRows()
    }
    setActionLoading(false)
  }

  const counts = {
    pending: rows.filter(r => r.payments?.status === 'pending').length,
    approved: rows.filter(r => r.payments?.status === 'approved').length,
    rejected: rows.filter(r => r.payments?.status === 'rejected').length,
    all: rows.length,
  }

  const filtered = rows
    .filter(r => filter === 'all' || r.payments?.status === filter)
    .filter(r => !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || r.mobile.includes(search) || r.application_id.toLowerCase().includes(search.toLowerCase()))

  const statusColor = (s?: string) =>
    s === 'approved' ? 'text-green-400 bg-green-900/20 border-green-700/30' :
    s === 'rejected' ? 'text-red-400 bg-red-900/20 border-red-700/30' :
    'text-yellow-400 bg-yellow-900/20 border-yellow-700/30'

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-xl p-4 border text-left transition-all ${filter === s ? 'border-yellow-500 bg-yellow-900/20' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
            <div className="text-2xl font-bold text-white">{counts[s]}</div>
            <div className="text-xs text-zinc-400 mt-0.5 capitalize">{s === 'all' ? 'Total' : s}</div>
          </button>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="font-semibold text-white text-sm flex-1">
            Registrations {filter !== 'all' && `— ${filter}`} ({filtered.length})
          </h2>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name / mobile / ID…"
            className="bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500 w-full sm:w-56" />
          <button onClick={fetchRows} className="text-xs text-zinc-400 hover:text-white transition-colors shrink-0">↻ Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No registrations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name / ID</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Mobile</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Pass</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.application_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{row.full_name}</div>
                      <div className="text-zinc-500 text-xs font-mono">{row.application_id}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">{row.mobile}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-zinc-300">
                        {SEAT_TIERS[row.seat_tier as keyof typeof SEAT_TIERS]?.badge}{' '}
                        {SEAT_TIERS[row.seat_tier as keyof typeof SEAT_TIERS]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColor(row.payments?.status)}`}>
                        {row.payments?.status ?? 'no payment'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(row)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 font-medium transition-colors">
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Registration Detail</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2 text-sm">
                {[
                  { l: 'Name', v: selected.full_name },
                  { l: 'Mobile', v: selected.mobile },
                  { l: 'Email', v: selected.email ?? '—' },
                  { l: 'Age', v: selected.age ? String(selected.age) : '—' },
                  { l: 'Address', v: selected.address ?? '—' },
                  { l: 'Application ID', v: selected.application_id },
                  { l: 'Pass', v: `${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.badge} ${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.label}` },
                  { l: 'Amount', v: `₹${selected.payments?.amount?.toLocaleString() ?? '–'}` },
                  { l: 'UTR Number', v: selected.payments?.utr_number ?? '– not provided –' },
                  { l: 'Payment Status', v: selected.payments?.status ?? 'no payment yet' },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between gap-4">
                    <span className="text-zinc-500 shrink-0">{l}</span>
                    <span className="text-white text-right font-medium break-all">{v}</span>
                  </div>
                ))}
              </div>

              {screenshotUrl && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Payment Screenshot</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-xl border border-white/10" />
                </div>
              )}

              {selected.payments?.status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Note (for rejection reason)</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Reason for rejection (if rejecting)"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleVerify('approve')} disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 transition-colors">
                      {actionLoading ? '...' : '✅ Approve'}
                    </button>
                    <button onClick={() => handleVerify('reject')} disabled={actionLoading}
                      className="bg-red-700 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 transition-colors">
                      {actionLoading ? '...' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              )}
              {selected.payments?.status !== 'pending' && (
                <div className={`rounded-xl px-4 py-3 text-sm text-center ${statusColor(selected.payments?.status)}`}>
                  Payment is {selected.payments?.status ?? 'not submitted'}
                  {selected.payments?.rejection_reason && ` — ${selected.payments.rejection_reason}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── CONTESTANTS TAB ──────────────────────────────────────────────────────────

const emptyForm = { name: '', tagline: '', bio: '', photo_url: '', category: '', display_order: 0 }

function ContestantsTab() {
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Contestant | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const fetchContestants = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/contestants')
    if (res.ok) {
      const data = await res.json()
      setContestants(data.contestants)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContestants() }, [fetchContestants])

  function openCreate() {
    setForm(emptyForm)
    setPhotoFile(null)
    setError('')
    setCreating(true)
    setEditing(null)
  }

  function openEdit(c: Contestant) {
    setForm({ name: c.name, tagline: c.tagline ?? '', bio: c.bio ?? '', photo_url: c.photo_url ?? '', category: c.category ?? '', display_order: c.display_order })
    setPhotoFile(null)
    setError('')
    setEditing(c)
    setCreating(false)
  }

  function closeModal() {
    setEditing(null)
    setCreating(false)
    setError('')
  }

  async function uploadPhoto(contestantId: string): Promise<string | null> {
    if (!photoFile) return null
    setUploading(true)
    const urlRes = await fetch('/api/admin/contestant-photo-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestantId, fileName: photoFile.name }),
    })
    const urlData = await urlRes.json()
    if (!urlRes.ok) { setError(urlData.error ?? 'Upload failed'); setUploading(false); return null }

    await fetch(urlData.signedUrl, { method: 'PUT', body: photoFile, headers: { 'Content-Type': photoFile.type } })
    setUploading(false)
    return urlData.publicUrl
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    if (creating) {
      // Create first to get an ID, then upload photo
      const res = await fetch('/api/admin/contestants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, display_order: Number(form.display_order) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }

      const contestantId = data.contestant.id
      if (photoFile) {
        const photoUrl = await uploadPhoto(contestantId)
        if (photoUrl) {
          await fetch(`/api/admin/contestants/${contestantId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo_url: photoUrl }),
          })
        }
      }
    } else if (editing) {
      let photoUrl = form.photo_url
      if (photoFile) {
        const uploaded = await uploadPhoto(editing.id)
        if (uploaded) photoUrl = uploaded
      }
      const res = await fetch(`/api/admin/contestants/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo_url: photoUrl, display_order: Number(form.display_order) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); setSaving(false); return }
    }

    setSaving(false)
    closeModal()
    fetchContestants()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/contestants/${id}`, { method: 'DELETE' })
    fetchContestants()
  }

  const isOpen = creating || !!editing

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold">Contestants ({contestants.length})</h2>
        <button onClick={openCreate}
          className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:from-yellow-500 hover:to-yellow-300 transition-all">
          + Add Contestant
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : contestants.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No contestants yet. Add one above.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contestants.map((c) => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="aspect-[3/2] bg-gradient-to-br from-purple-900/40 to-yellow-900/20 relative overflow-hidden">
                {c.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-5xl">👸</div>
                )}
                {c.category && (
                  <div className="absolute top-2 left-2 bg-black/60 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-700/40">
                    {c.category}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-zinc-400 text-xs px-2 py-1 rounded-full">
                  #{c.display_order}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-bold text-white">{c.name}</div>
                {c.tagline && <div className="text-zinc-400 text-sm italic mt-0.5">"{c.tagline}"</div>}
                {c.bio && <div className="text-zinc-500 text-xs mt-2 line-clamp-2">{c.bio}</div>}
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                  <button onClick={() => openEdit(c)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)}
                    className="flex-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 text-xs font-medium py-2 rounded-lg transition-colors">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">{creating ? 'Add Contestant' : `Edit — ${editing?.name}`}</h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

              {[
                { label: 'Name *', field: 'name', placeholder: 'Contestant full name' },
                { label: 'Category', field: 'category', placeholder: 'e.g. Miss Elegance' },
                { label: 'Tagline', field: 'tagline', placeholder: 'Short catchy phrase' },
                { label: 'Display Order', field: 'display_order', placeholder: '1', type: 'number' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
                  <input type={type ?? 'text'} value={String(form[field as keyof typeof form])}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition-colors" />
                </div>
              ))}

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Short biography or description"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Photo</label>
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${photoFile ? 'border-green-600 bg-green-900/10' : 'border-white/10 hover:border-yellow-700/50 bg-white/5'}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
                  {photoFile ? (
                    <div className="text-center">
                      <div className="text-green-400 text-sm font-medium">{photoFile.name}</div>
                      <div className="text-zinc-500 text-xs">{(photoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-zinc-400 text-sm">📷 Click to upload photo</div>
                      <div className="text-zinc-600 text-xs mt-0.5">JPG, PNG or WebP</div>
                    </div>
                  )}
                </label>
                {!photoFile && form.photo_url && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.photo_url} alt="Current" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    <span className="text-zinc-500 text-xs">Current photo (upload new to replace)</span>
                  </div>
                )}
              </div>

              <button onClick={handleSave} disabled={saving || uploading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
                {uploading ? 'Uploading photo…' : saving ? 'Saving…' : creating ? 'Add Contestant' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── VOTES TAB ────────────────────────────────────────────────────────────────

function VotesTab() {
  const [results, setResults] = useState<VoteResult[]>([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const fetchVotes = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/votes')
    if (res.ok) {
      const data = await res.json()
      setResults(data.results)
      setTotalVotes(data.totalVotes)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchVotes() }, [fetchVotes])

  async function handleResetAll() {
    if (!confirm('Reset ALL votes? This cannot be undone.')) return
    setResetting(true)
    await fetch('/api/admin/votes', { method: 'DELETE' })
    setResetting(false)
    fetchVotes()
  }

  const maxVotes = results[0]?.count ?? 1

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold">Vote Results</h2>
          <div className="text-zinc-500 text-sm mt-0.5">Total votes cast: <span className="text-yellow-400 font-semibold">{totalVotes}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchVotes} className="text-xs text-zinc-400 hover:text-white transition-colors">↻ Refresh</button>
          <button onClick={handleResetAll} disabled={resetting || totalVotes === 0}
            className="bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/40 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-40 transition-colors">
            {resetting ? 'Resetting…' : '🗑️ Reset All Votes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <div className="text-4xl mb-3">🗳️</div>
          <div>No votes yet</div>
          <div className="text-xs text-zinc-600 mt-1">Registered attendees with approved payments can vote from the website</div>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => {
            const pct = Math.round((r.count / Math.max(totalVotes, 1)) * 100)
            return (
              <div key={r.contestantId} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className={`text-lg font-bold w-7 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-700' : 'text-zinc-600'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                {r.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo_url} alt={r.name} className="w-10 h-10 rounded-full object-cover border border-white/20" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-900/40 flex items-center justify-center text-xl">👸</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-white font-semibold text-sm">{r.name}</span>
                      {r.category && <span className="text-zinc-500 text-xs ml-2">{r.category}</span>}
                    </div>
                    <span className="text-yellow-400 font-bold text-sm shrink-0">{r.count} vote{r.count !== 1 ? 's' : ''} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all" style={{ width: `${(r.count / maxVotes) * 100}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
