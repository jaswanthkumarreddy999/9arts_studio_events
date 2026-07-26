'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SEAT_TIERS } from '@/lib/types'
import Link from 'next/link'

type PaymentStatus = 'pending' | 'approved' | 'rejected'
type RegStatus = 'active' | 'done' | 'payment_pending' | 'review' | 'deleted'
type AdminTab = 'registrations' | 'contestants' | 'votes'
const VOTE_CATEGORIES = ['kid', 'teen', 'miss', 'misses'] as const
type VoteCategory = typeof VOTE_CATEGORIES[number]

const REG_STATUS_META: Record<RegStatus, { label: string; color: string; icon: string }> = {
  active:          { label: 'Active',          icon: '🟢', color: 'text-green-400 bg-green-900/20 border-green-700/30' },
  done:            { label: 'Done',            icon: '✅', color: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/30' },
  payment_pending: { label: 'Payment Pending', icon: '⏳', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30' },
  review:          { label: 'Under Review',    icon: '🔍', color: 'text-blue-400 bg-blue-900/20 border-blue-700/30' },
  deleted:         { label: 'Deleted',         icon: '🗑️', color: 'text-red-400 bg-red-900/20 border-red-700/30' },
}

interface PaymentRecord {
  status: PaymentStatus
  utr_number?: string
  screenshot_path?: string
  submitted_at?: string
  rejection_reason?: string
  verified_at?: string
  amount?: number
}

interface RegRow {
  application_id: string
  full_name: string
  mobile: string
  gender?: string
  seat_tier: string
  created_at: string
  registration_status: RegStatus
  status_note?: string
  payments: PaymentRecord | null
}

interface Contestant {
  id: string
  name: string
  tagline?: string
  bio?: string
  photo_url?: string
  category?: string
  contestant_category?: VoteCategory
  display_order: number
}

interface CategoryResult {
  contestantId: string
  name: string
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
            <Link href="/scan" className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors hidden sm:block">📷 Scanner</Link>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Logout</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(['registrations', 'contestants', 'votes'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
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
  const [statusFilter, setStatusFilter] = useState<RegStatus | 'all'>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all')
  const [selected, setSelected] = useState<RegRow | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/registrations')
    if (res.ok) {
      const data = await res.json()
      // Supabase returns payments as array (one-to-many) — normalize to single object
      const normalized = (data.registrations ?? []).map((r: RegRow & { payments: PaymentRecord | PaymentRecord[] | null }) => ({
        ...r,
        payments: Array.isArray(r.payments) ? (r.payments[0] ?? null) : r.payments,
      }))
      setRows(normalized)
    } else {
      console.error('Failed to fetch registrations:', res.status, await res.text())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  async function openDetail(row: RegRow) {
    setSelected(row)
    setPaymentNote('')
    setStatusNote(row.status_note ?? '')
    setScreenshotUrl('')
    if (row.payments?.screenshot_path) {
      const res = await fetch('/api/admin/screenshot-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: row.payments.screenshot_path }),
      })
      if (res.ok) { const d = await res.json(); setScreenshotUrl(d.url) }
    }
  }

  async function handlePaymentAction(action: 'approve' | 'reject') {
    if (!selected) return
    setActionLoading(true)
    const res = await fetch('/api/admin/verify-payment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: selected.application_id, action, note: paymentNote }),
    })
    if (res.ok) { await fetchRows(); setSelected(null) }
    setActionLoading(false)
  }

  async function handleStatusChange(newStatus: RegStatus) {
    if (!selected) return
    setActionLoading(true)
    const res = await fetch(`/api/admin/registrations/${selected.application_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, note: statusNote }),
    })
    if (res.ok) {
      setSelected(s => s ? { ...s, registration_status: newStatus, status_note: statusNote } : null)
      await fetchRows()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(`Status update failed: ${d.error ?? res.status}`)
    }
    setActionLoading(false)
  }

  async function handleHardDelete() {
    if (!selected) return
    if (!confirm(`PERMANENTLY DELETE "${selected.full_name}"?\n\nThis will remove ALL their data including payment records. This cannot be undone.`)) return
    setActionLoading(true)
    const res = await fetch(`/api/admin/registrations/${selected.application_id}`, { method: 'DELETE' })
    if (res.ok) { setSelected(null); await fetchRows() }
    else { const d = await res.json(); alert(d.error) }
    setActionLoading(false)
  }

  const counts = {
    all: rows.length,
    active: rows.filter(r => (r.registration_status ?? 'active') === 'active').length,
    done: rows.filter(r => r.registration_status === 'done').length,
    payment_pending: rows.filter(r => r.registration_status === 'payment_pending').length,
    review: rows.filter(r => r.registration_status === 'review').length,
    deleted: rows.filter(r => r.registration_status === 'deleted').length,
  }

  const filtered = rows
    .filter(r => statusFilter === 'all' || (r.registration_status ?? 'active') === statusFilter)
    .filter(r => paymentFilter === 'all' || r.payments?.status === paymentFilter)
    .filter(r => !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || r.mobile.includes(search) || r.application_id.toLowerCase().includes(search.toLowerCase()))

  const paymentColor = (s?: string) =>
    s === 'approved' ? 'text-green-400 bg-green-900/20 border-green-700/30' :
    s === 'rejected' ? 'text-red-400 bg-red-900/20 border-red-700/30' :
    'text-yellow-400 bg-yellow-900/20 border-yellow-700/30'

  return (
    <>
      {/* Registration status stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {(['all', 'active', 'done', 'payment_pending', 'review', 'deleted'] as const).map((s) => {
          const meta = s === 'all' ? null : REG_STATUS_META[s]
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-xl p-3 border text-left transition-all ${statusFilter === s ? 'border-yellow-500 bg-yellow-900/20' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
              <div className="text-xl font-bold text-white">{counts[s]}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{meta ? `${meta.icon} ${meta.label}` : '📋 All'}</div>
            </button>
          )
        })}
      </div>

      {/* Payment filter + search */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-zinc-500 text-xs">Payment:</span>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setPaymentFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${paymentFilter === s ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400 hover:border-white/30'}`}>
            {s}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / mobile / ID…"
          className="ml-auto bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500 w-full sm:w-52" />
        <button onClick={fetchRows} className="text-xs text-zinc-400 hover:text-white transition-colors">↻</button>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/10">
          <span className="text-white text-sm font-semibold">Registrations ({filtered.length})</span>
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
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const sm = REG_STATUS_META[row.registration_status] ?? REG_STATUS_META['active']
                  return (
                    <tr key={row.application_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{row.full_name}</div>
                        <div className="text-zinc-500 text-xs font-mono">{row.application_id}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">{row.mobile}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-zinc-300">
                        {SEAT_TIERS[row.seat_tier as keyof typeof SEAT_TIERS]?.badge}{' '}
                        {SEAT_TIERS[row.seat_tier as keyof typeof SEAT_TIERS]?.label}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${sm.color}`}>{sm.icon} {sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${paymentColor(row.payments?.status)}`}>
                          {row.payments?.status ?? 'none'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(row)} className="text-xs text-yellow-400 hover:text-yellow-300 font-medium">View →</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Registration Detail</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-5">
              {/* Info */}
              <div className="space-y-2 text-sm">
                {[
                  { l: 'Name', v: selected.full_name },
                  { l: 'Mobile', v: selected.mobile },
                  { l: 'Gender', v: selected.gender ? selected.gender.charAt(0).toUpperCase() + selected.gender.slice(1) : '—' },
                  { l: 'Application ID', v: selected.application_id },
                  { l: 'Pass', v: `${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.badge} ${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.label}` },
                  { l: 'Amount Paid', v: `₹${selected.payments?.amount?.toLocaleString() ?? '–'}` },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between gap-4">
                    <span className="text-zinc-500 shrink-0">{l}</span>
                    <span className="text-white text-right font-medium break-all">{v}</span>
                  </div>
                ))}
              </div>

              {/* Payment verification */}
              {!selected.payments ? (
                <div className="border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Payment</div>
                  <div className="text-sm text-zinc-500 italic">No payment record found for this registration.</div>
                  <div className="text-xs text-zinc-600">Use &quot;Grant Free Pass&quot; below to approve without payment.</div>
                </div>
              ) : selected.payments.status === 'pending' ? (
                <div className="border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Payment Verification</div>

                  {/* UTR display */}
                  <div className={`rounded-lg px-3 py-2.5 text-sm flex items-center justify-between gap-2 ${selected.payments.utr_number ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-white/5 border border-white/10'}`}>
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">UTR / Transaction ID</div>
                      {selected.payments.utr_number
                        ? <div className="text-white font-mono font-bold">{selected.payments.utr_number}</div>
                        : <div className="text-zinc-500 italic">Not submitted yet</div>
                      }
                    </div>
                    {selected.payments.utr_number && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(selected.payments!.utr_number!)}
                        className="text-xs text-zinc-400 hover:text-yellow-400 transition-colors shrink-0"
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  {/* Screenshot */}
                  {screenshotUrl ? (
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Payment Screenshot</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-xl border border-white/10" />
                    </div>
                  ) : selected.payments.screenshot_path ? (
                    <div className="text-xs text-zinc-500 italic">Screenshot uploaded — preview unavailable.</div>
                  ) : (
                    <div className="text-xs text-zinc-600 italic">No screenshot uploaded yet.</div>
                  )}

                  <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                    placeholder="Rejection reason (optional)"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500" />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handlePaymentAction('approve')} disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
                      {actionLoading ? '…' : '✅ Approve'}
                    </button>
                    <button onClick={() => handlePaymentAction('reject')} disabled={actionLoading}
                      className="bg-red-700 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
                      {actionLoading ? '…' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl p-4 space-y-3 text-sm ${paymentColor(selected.payments.status)}`}>
                  {/* Status header */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {selected.payments.status === 'approved' ? '✅' : '❌'}
                    </span>
                    <div className="font-semibold">
                      Payment {selected.payments.status}
                      {selected.payments.rejection_reason && ` — ${selected.payments.rejection_reason}`}
                    </div>
                  </div>

                  {/* UTR */}
                  <div className="bg-black/20 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs opacity-60 mb-0.5">UTR / Transaction ID</div>
                      {selected.payments.utr_number
                        ? <div className="font-mono font-bold text-white">{selected.payments.utr_number}</div>
                        : <div className="opacity-50 italic">Not provided</div>
                      }
                    </div>
                    {selected.payments.utr_number && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(selected.payments!.utr_number!)}
                        className="text-xs opacity-60 hover:opacity-100 transition-opacity shrink-0"
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  {/* Screenshot */}
                  {screenshotUrl ? (
                    <div>
                      <div className="text-xs opacity-60 uppercase tracking-wide mb-2">Payment Screenshot</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-xl border border-white/10" />
                    </div>
                  ) : selected.payments.screenshot_path ? (
                    <div className="text-xs opacity-50 italic">Screenshot uploaded — preview unavailable.</div>
                  ) : (
                    <div className="bg-black/20 rounded-lg px-3 py-2 text-xs opacity-50 italic">No screenshot provided</div>
                  )}
                </div>
              )}

              {/* Registration status management */}
              <div className="border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Registration Status</div>
                <div className="text-sm text-zinc-300">
                  Current: <span className={`font-semibold ${REG_STATUS_META[selected.registration_status ?? 'active'].color.split(' ')[0]}`}>
                    {REG_STATUS_META[selected.registration_status ?? 'active'].icon} {REG_STATUS_META[selected.registration_status ?? 'active'].label}
                  </span>
                </div>
                {selected.status_note && (
                  <div className="text-xs text-zinc-500 italic">Note: {selected.status_note}</div>
                )}
                <input type="text" value={statusNote} onChange={e => setStatusNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500" />

                {/* Free Pass grant — complimentary access without payment */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleStatusChange('done') }}
                  disabled={actionLoading || selected.registration_status === 'done'}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-emerald-600/50 text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 disabled:opacity-40 transition-colors">
                  {actionLoading ? '…' : selected.registration_status === 'done' ? '✅ Free Pass Already Granted' : '🎁 Grant Free Pass — skip payment, generate QR'}
                </button>

                <div className="text-xs text-zinc-600 text-center">— or change status —</div>

                <div className="grid grid-cols-2 gap-2">
                  {(['active', 'payment_pending', 'review'] as const).map(s => (
                    <button key={s} onClick={(e) => { e.stopPropagation(); handleStatusChange(s) }} disabled={actionLoading || selected.registration_status === s}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all disabled:opacity-40 ${REG_STATUS_META[s].color}`}>
                      {REG_STATUS_META[s].icon} {REG_STATUS_META[s].label}
                    </button>
                  ))}
                  {/* Revoke done — allows going back from done if needed */}
                  {selected.registration_status === 'done' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange('active') }} disabled={actionLoading}
                      className="py-2 px-3 rounded-xl text-xs font-semibold border transition-all border-zinc-600 text-zinc-400 bg-zinc-900/40 hover:bg-zinc-800/60">
                      ↩️ Revoke Done → Active
                    </button>
                  )}
                </div>
                {/* Move to trash */}
                {(selected.registration_status ?? 'active') !== 'deleted' ? (
                  <button onClick={(e) => { e.stopPropagation(); handleStatusChange('deleted') }} disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-700/40 text-red-400 bg-red-900/20 hover:bg-red-900/40 disabled:opacity-40 transition-colors">
                    🗑️ Move to Trash — blocks login, retains data
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-500 text-center">This registration is in trash. Login is blocked.</div>
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange('active') }} disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border border-green-700/40 text-green-400 bg-green-900/20 hover:bg-green-900/40 disabled:opacity-40 transition-colors">
                      ↩️ Restore from Trash
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleHardDelete() }} disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-500/50 text-red-300 bg-red-900/30 hover:bg-red-800/50 disabled:opacity-40 transition-colors">
                      ☠️ Permanently Delete — removes all data forever
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── CONTESTANTS TAB ──────────────────────────────────────────────────────────

const CONTESTANT_CATEGORIES: { value: VoteCategory; label: string; icon: string }[] = [
  { value: 'kid',    label: 'Little', icon: '🧒' },
  { value: 'teen',   label: 'Teen',   icon: '👧' },
  { value: 'miss',   label: 'Miss',   icon: '👩' },
  { value: 'misses', label: 'Misses', icon: '👑' },
]

const emptyForm = { name: '', tagline: '', bio: '', photo_url: '', category: '', contestant_category: '' as VoteCategory | '', display_order: 0 }

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
  const [filterCat, setFilterCat] = useState<VoteCategory | 'all'>('all')

  const fetchContestants = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/contestants')
    if (res.ok) { const d = await res.json(); setContestants(d.contestants) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContestants() }, [fetchContestants])

  function openCreate() { setForm(emptyForm); setPhotoFile(null); setError(''); setCreating(true); setEditing(null) }
  function openEdit(c: Contestant) {
    setForm({ name: c.name, tagline: c.tagline ?? '', bio: c.bio ?? '', photo_url: c.photo_url ?? '', category: c.category ?? '', contestant_category: c.contestant_category ?? '', display_order: c.display_order })
    setPhotoFile(null); setError(''); setEditing(c); setCreating(false)
  }
  function closeModal() { setEditing(null); setCreating(false); setError('') }

  async function uploadPhoto(contestantId: string): Promise<string | null> {
    if (!photoFile) return null
    setUploading(true)
    const fd = new FormData()
    fd.append('file', photoFile)
    fd.append('contestantId', contestantId)
    const res = await fetch('/api/admin/contestant-photo-url', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setError(data.error ?? 'Upload failed'); return null }
    return data.publicUrl
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.contestant_category) { setError('Vote category is required (little / teen / miss / misses)'); return }
    setSaving(true); setError('')

    const payload = { ...form, display_order: Number(form.display_order) }

    if (creating) {
      const res = await fetch('/api/admin/contestants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }
      if (photoFile) {
        const photoUrl = await uploadPhoto(data.contestant.id)
        if (!photoUrl) { setSaving(false); return } // upload error already set
        await fetch(`/api/admin/contestants/${data.contestant.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo_url: photoUrl }) })
      }
    } else if (editing) {
      let photoUrl = form.photo_url
      if (photoFile) {
        const uploaded = await uploadPhoto(editing.id)
        if (!uploaded) { setSaving(false); return } // upload error already set
        photoUrl = uploaded
      }
      const res = await fetch(`/api/admin/contestants/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, photo_url: photoUrl }) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); setSaving(false); return }
    }

    setSaving(false); closeModal(); fetchContestants()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/contestants/${id}`, { method: 'DELETE' })
    fetchContestants()
  }

  const displayed = filterCat === 'all' ? contestants : contestants.filter(c => c.contestant_category === filterCat)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterCat('all')} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filterCat === 'all' ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400'}`}>
            All ({contestants.length})
          </button>
          {CONTESTANT_CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setFilterCat(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filterCat === cat.value ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400'}`}>
              {cat.icon} {cat.label} ({contestants.filter(c => c.contestant_category === cat.value).length})
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:from-yellow-500 hover:to-yellow-300 transition-all">
          + Add Contestant
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No contestants in this category.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((c) => {
            const catMeta = CONTESTANT_CATEGORIES.find(x => x.value === c.contestant_category)
            return (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[3/2] bg-gradient-to-br from-purple-900/40 to-yellow-900/20 relative overflow-hidden">
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-5xl">👸</div>
                  )}
                  {catMeta && (
                    <div className="absolute top-2 left-2 bg-black/70 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-700/40">
                      {catMeta.icon} {catMeta.label}
                    </div>
                  )}
                  {c.category && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-zinc-300 text-xs px-2 py-1 rounded-full">
                      {c.category}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 text-zinc-400 text-xs px-2 py-1 rounded-full">#{c.display_order}</div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="font-bold text-white">{c.name}</div>
                  {c.tagline && <div className="text-zinc-400 text-sm italic mt-0.5">&ldquo;{c.tagline}&rdquo;</div>}
                  {c.bio && <div className="text-zinc-500 text-xs mt-2 line-clamp-2">{c.bio}</div>}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                    <button onClick={() => openEdit(c)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 rounded-lg">✏️ Edit</button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="flex-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 text-xs font-medium py-2 rounded-lg">🗑️ Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(creating || !!editing) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">{creating ? 'Add Contestant' : `Edit — ${editing?.name}`}</h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

              {/* Vote category — required */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Vote Category * (determines which poll they appear in)</label>
                <div className="grid grid-cols-4 gap-2">
                  {CONTESTANT_CATEGORIES.map(cat => (
                    <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, contestant_category: cat.value }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.contestant_category === cat.value ? 'border-yellow-500 bg-yellow-900/20 text-yellow-400' : 'border-white/10 text-zinc-400 hover:border-white/30'}`}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { label: 'Name *', field: 'name', placeholder: 'Contestant full name' },
                { label: 'Sub-category / Title', field: 'category', placeholder: 'e.g. Miss Elegance' },
                { label: 'Tagline', field: 'tagline', placeholder: 'Short catchy phrase' },
                { label: 'Display Order', field: 'display_order', placeholder: '1', type: 'number' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
                  <input type={type ?? 'text'} value={String(form[field as keyof typeof form])}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500" />
                </div>
              ))}

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short biography" rows={3}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Photo</label>
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer ${photoFile ? 'border-green-600 bg-green-900/10' : 'border-white/10 hover:border-yellow-700/50 bg-white/5'}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
                  {photoFile ? (
                    <div className="text-center"><div className="text-green-400 text-sm font-medium">{photoFile.name}</div><div className="text-zinc-500 text-xs">{(photoFile.size / 1024 / 1024).toFixed(1)} MB</div></div>
                  ) : (
                    <div className="text-center"><div className="text-zinc-400 text-sm">📷 Click to upload photo</div><div className="text-zinc-600 text-xs mt-0.5">JPG, PNG or WebP</div></div>
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
                {uploading ? 'Uploading…' : saving ? 'Saving…' : creating ? 'Add Contestant' : 'Save Changes'}
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
  const [byCategory, setByCategory] = useState<Record<string, CategoryResult[]>>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)

  const fetchVotes = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/votes')
    if (res.ok) { const d = await res.json(); setByCategory(d.byCategory); setTotalVotes(d.totalVotes) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchVotes() }, [fetchVotes])

  async function handleReset(category?: string) {
    const label = category ? `all ${category} votes` : 'ALL votes across every category'
    if (!confirm(`Reset ${label}? This cannot be undone.`)) return
    setResetting(category ?? 'all')
    await fetch('/api/admin/votes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category ? { category } : {}),
    })
    setResetting(null)
    fetchVotes()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold">Vote Results by Category</h2>
          <div className="text-zinc-500 text-sm mt-0.5">Total votes cast: <span className="text-yellow-400 font-semibold">{totalVotes}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchVotes} className="text-xs text-zinc-400 hover:text-white">↻ Refresh</button>
          <button onClick={() => handleReset()} disabled={resetting !== null || totalVotes === 0}
            className="bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/40 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-40">
            {resetting === 'all' ? 'Resetting…' : '🗑️ Reset All'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : (
        <div className="space-y-8">
          {VOTE_CATEGORIES.map(cat => {
            const catMeta = CONTESTANT_CATEGORIES.find(x => x.value === cat)!
            const results = byCategory[cat] ?? []
            const catTotal = results.reduce((s, r) => s + r.count, 0)
            const maxCount = results[0]?.count ?? 1

            return (
              <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{catMeta.icon} {catMeta.label} Category</h3>
                    <div className="text-zinc-500 text-xs mt-0.5">{catTotal} vote{catTotal !== 1 ? 's' : ''} cast</div>
                  </div>
                  <button onClick={() => handleReset(cat)} disabled={resetting !== null || catTotal === 0}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-700/30 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                    {resetting === cat ? 'Resetting…' : '🗑️ Reset'}
                  </button>
                </div>

                {results.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-sm">No votes yet in this category</div>
                ) : (
                  <div className="p-4 space-y-3">
                    {results.map((r, i) => {
                      const pct = catTotal > 0 ? Math.round((r.count / catTotal) * 100) : 0
                      return (
                        <div key={r.contestantId} className="flex items-center gap-3">
                          <div className={`text-base w-7 text-center font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-700' : 'text-zinc-600'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </div>
                          {r.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.photo_url} alt={r.name} className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-900/40 flex items-center justify-center text-base shrink-0">👸</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white text-sm font-medium truncate">{r.name}</span>
                              <span className="text-yellow-400 text-xs font-bold ml-2 shrink-0">{r.count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
