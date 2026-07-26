'use client'

import { useState, useEffect, useCallback } from 'react'

const VOTE_CATEGORIES = ['kid', 'teen', 'miss', 'misses'] as const
type VoteCategory = typeof VOTE_CATEGORIES[number]

const CAT_META: Record<VoteCategory, { label: string; icon: string }> = {
  kid:    { label: 'Little', icon: '🧒' },
  teen:   { label: 'Teen',   icon: '👧' },
  miss:   { label: 'Miss',   icon: '👩' },
  misses: { label: 'Misses', icon: '👑' },
}

interface VoteRow {
  id: string
  contestantId: string
  contestantName: string
  photo_url: string | null
  category: VoteCategory
  applicationId: string
  votedAt: string
}

interface ContestantResult {
  contestantId: string
  name: string
  photo_url: string | null
  count: number
  adjustment: number
  displayCount: number
}

// ─── Inline adjust control ────────────────────────────────────────────────────
function AdjustControl({ contestantId, category, currentAdjustment, onSaved }: {
  contestantId: string
  category: string
  currentAdjustment: number
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(currentAdjustment))
  const [saving, setSaving] = useState(false)

  async function save() {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    setSaving(true)
    await fetch('/api/admin/vote-adjustments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestantId, category, adjustment: num }),
    })
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setValue(String(currentAdjustment)); setEditing(true) }}
        className="text-xs text-zinc-500 hover:text-yellow-400 border border-white/10 hover:border-yellow-700/40 px-2 py-1.5 rounded-lg transition-colors shrink-0"
        title="Adjust vote count"
      >
        ✏️ Edit
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={() => setValue(v => String(parseInt(v || '0') - 1))}
        className="w-7 h-7 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 text-base font-bold flex items-center justify-center">−</button>
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-16 bg-black/40 border border-yellow-700/40 text-white text-sm text-center rounded px-1 py-1 focus:outline-none"
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
      />
      <button onClick={() => setValue(v => String(parseInt(v || '0') + 1))}
        className="w-7 h-7 rounded bg-green-900/40 text-green-400 hover:bg-green-900/60 text-base font-bold flex items-center justify-center">+</button>
      <button onClick={save} disabled={saving}
        className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-2.5 py-1.5 rounded disabled:opacity-50">
        {saving ? '…' : '✓'}
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:text-white px-1">✕</button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VoteEditor() {
  const [categoryVotes, setCategoryVotes] = useState<Record<string, VoteRow[]>>({})
  const [byCategory, setByCategory] = useState<Record<string, ContestantResult[]>>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<VoteCategory | null>(null)
  const [view, setView] = useState<'counts' | 'voters'>('counts')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/votes')
    if (res.ok) {
      const d = await res.json()
      setCategoryVotes(d.categoryVotes ?? {})
      setByCategory(d.byCategory ?? {})
      setTotalVotes(d.totalVotes ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDeleteOne(voteId: string, applicationId: string) {
    if (!confirm(`Delete vote from ${applicationId}? They will be able to vote again in this category.`)) return
    await fetch(`/api/admin/votes/${voteId}`, { method: 'DELETE' })
    fetchData()
  }

  async function handleResetCategory(cat: VoteCategory, count: number) {
    if (!confirm(`Reset all ${count} vote${count !== 1 ? 's' : ''} in ${CAT_META[cat].label} category?\n\nAll voters in this category will be able to vote again.`)) return
    await fetch('/api/admin/votes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat }),
    })
    fetchData()
  }

  async function handleResetAll() {
    if (!confirm(`Reset ALL ${totalVotes} votes across every category?\n\nEvery registered user will be able to vote again. This cannot be undone.`)) return
    setResetting(true)
    await fetch('/api/admin/votes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setResetting(false)
    fetchData()
  }

  if (loading) {
    return <div className="text-center py-20 text-zinc-500">Loading votes...</div>
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm">Total votes: <span className="text-yellow-400 font-semibold">{totalVotes}</span></span>
          <button onClick={fetchData} className="text-xs text-zinc-500 hover:text-white transition-colors">↻ Refresh</button>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
            <button onClick={() => setView('counts')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${view === 'counts' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
              📊 Counts
            </button>
            <button onClick={() => setView('voters')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${view === 'voters' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
              👥 Voters
            </button>
          </div>
          {view === 'voters' && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Application ID…"
              className="bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500 w-48"
            />
          )}
          <button
            onClick={handleResetAll}
            disabled={resetting || totalVotes === 0}
            className="bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/40 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-40 transition-colors"
          >
            {resetting ? 'Resetting…' : '🔄 Reset All'}
          </button>
        </div>
      </div>

      {/* ── COUNTS VIEW ── */}
      {view === 'counts' && (
        <div className="space-y-4">
          {VOTE_CATEGORIES.map(cat => {
            const meta = CAT_META[cat]
            const results = byCategory[cat] ?? []
            const catTotal = results.reduce((s, r) => s + r.displayCount, 0)
            const maxCount = Math.max(...results.map(r => r.displayCount), 1)

            return (
              <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold">{meta.icon} {meta.label}</span>
                    <span className="text-zinc-500 text-xs ml-2">{catTotal} vote{catTotal !== 1 ? 's' : ''}</span>
                  </div>
                  <button onClick={() => handleResetCategory(cat, results.reduce((s, r) => s + r.count, 0))}
                    disabled={results.length === 0}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-700/30 px-3 py-1 rounded-lg disabled:opacity-40 transition-colors">
                    🔄 Reset
                  </button>
                </div>
                {results.length === 0 ? (
                  <div className="text-center py-5 text-zinc-600 text-sm">No votes yet</div>
                ) : (
                  <div className="p-4 space-y-3">
                    {results.map((r, i) => {
                      const pct = catTotal > 0 ? Math.round((r.displayCount / catTotal) * 100) : 0
                      return (
                        <div key={r.contestantId} className="flex items-center gap-3">
                          <div className={`text-sm w-6 text-center font-bold shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-700' : 'text-zinc-600'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                          </div>
                          {r.photo_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={r.photo_url} alt={r.name} className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-purple-900/40 flex items-center justify-center text-sm shrink-0">👸</div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white text-sm font-medium truncate">{r.name}</span>
                              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                {r.adjustment !== 0 && <span className="text-zinc-500 text-xs line-through">{r.count}</span>}
                                <span className="text-yellow-400 text-xs font-bold">{r.displayCount} ({pct}%)</span>
                                {r.adjustment !== 0 && (
                                  <span className={`text-xs font-semibold ${r.adjustment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {r.adjustment > 0 ? `+${r.adjustment}` : r.adjustment}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full" style={{ width: `${(r.displayCount / maxCount) * 100}%` }} />
                            </div>
                          </div>
                          <AdjustControl
                            contestantId={r.contestantId}
                            category={cat}
                            currentAdjustment={r.adjustment}
                            onSaved={fetchData}
                          />
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

      {/* ── VOTERS VIEW ── */}
      {view === 'voters' && (
        <div className="space-y-4">
          {VOTE_CATEGORIES.map(cat => {
            const meta = CAT_META[cat]
            const votes = (categoryVotes[cat] ?? []).filter(v =>
              !search || v.applicationId.toLowerCase().includes(search.toLowerCase())
            )
            const isExpanded = expanded === cat

            return (
              <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : cat)}
                    className="flex-1 px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                      <div className="text-white font-semibold">{meta.label}</div>
                      <div className="text-zinc-500 text-xs mt-0.5">{votes.length} vote{votes.length !== 1 ? 's' : ''}{search ? ' matching' : ''}</div>
                    </div>
                    <span className="text-zinc-500 ml-auto">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {(categoryVotes[cat] ?? []).length > 0 && (
                    <button
                      onClick={() => handleResetCategory(cat, (categoryVotes[cat] ?? []).length)}
                      className="mr-4 text-xs text-red-400 hover:text-red-300 border border-red-700/30 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      🔄 Reset
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-white/10">
                    {votes.length === 0 ? (
                      <div className="text-center py-6 text-zinc-600 text-sm">No votes{search ? ' matching' : ' yet'}</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {votes.map(vote => (
                          <div key={vote.id} className="flex items-center gap-3 px-5 py-3">
                            {vote.photo_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={vote.photo_url} alt={vote.contestantName} className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0" />
                              : <div className="w-9 h-9 rounded-full bg-purple-900/40 flex items-center justify-center text-base shrink-0">👸</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium truncate">{vote.contestantName}</div>
                              <div className="text-zinc-500 text-xs font-mono truncate">{vote.applicationId}</div>
                            </div>
                            <div className="text-zinc-600 text-xs hidden sm:block shrink-0">
                              {new Date(vote.votedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button
                              onClick={() => handleDeleteOne(vote.id, vote.applicationId)}
                              className="text-xs text-red-400 hover:text-red-300 border border-red-700/40 bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
