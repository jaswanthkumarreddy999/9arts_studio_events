'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SEAT_TIERS } from '@/lib/types'
import Link from 'next/link'

type PaymentStatus = 'pending' | 'approved' | 'rejected'

interface RegRow {
  application_id: string
  full_name: string
  mobile: string
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

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const router = useRouter()
  const [rows, setRows] = useState<RegRow[]>([])
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('pending')
  const [selected, setSelected] = useState<RegRow | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const filtered = rows.filter(r => filter === 'all' || r.payments?.status === filter)
  const counts = {
    pending: rows.filter(r => r.payments?.status === 'pending').length,
    approved: rows.filter(r => r.payments?.status === 'approved').length,
    rejected: rows.filter(r => r.payments?.status === 'rejected').length,
    all: rows.length,
  }

  const statusColor = (s?: string) =>
    s === 'approved' ? 'text-green-400 bg-green-900/20 border-green-700/30' :
    s === 'rejected' ? 'text-red-400 bg-red-900/20 border-red-700/30' :
    'text-yellow-400 bg-yellow-900/20 border-yellow-700/30'

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Top bar */}
      <header className="bg-black/60 border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">👑</span>
            <div>
              <div className="font-bold text-white text-sm">Miss Nellore 2025 — Admin</div>
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
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
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

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">
              Registrations {filter !== 'all' && `— ${filter}`} ({filtered.length})
            </h2>
            <button onClick={fetchRows} className="text-xs text-zinc-400 hover:text-white transition-colors">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-zinc-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">No registrations</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Name / ID</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Mobile</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Pass</th>
                    <th className="text-left px-4 py-3">Status</th>
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
              {/* Info */}
              <div className="space-y-2 text-sm">
                {[
                  { l: 'Name', v: selected.full_name },
                  { l: 'Mobile', v: selected.mobile },
                  { l: 'Application ID', v: selected.application_id },
                  { l: 'Pass', v: `${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.badge} ${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.label}` },
                  { l: 'Amount', v: `₹${selected.payments?.amount?.toLocaleString() ?? '–'}` },
                  { l: 'UTR Number', v: selected.payments?.utr_number ?? '– not provided –' },
                  { l: 'Payment Status', v: selected.payments?.status ?? 'pending' },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between gap-4">
                    <span className="text-zinc-500">{l}</span>
                    <span className="text-white text-right font-medium">{v}</span>
                  </div>
                ))}
              </div>

              {/* Screenshot */}
              {screenshotUrl && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Payment Screenshot</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-xl border border-white/10" />
                </div>
              )}

              {/* Actions — only for pending */}
              {selected.payments?.status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Note (optional — for rejection reason)</label>
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
                  Payment is {selected.payments?.status}
                  {selected.payments?.rejection_reason && ` — ${selected.payments.rejection_reason}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
