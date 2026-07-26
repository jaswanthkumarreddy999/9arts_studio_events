'use client'

import { useState, useEffect, useCallback } from 'react'

const VOTE_CATEGORIES = ['kid', 'teen', 'miss', 'misses'] as const
type VoteCategory = typeof VOTE_CATEGORIES[number]

const CAT_META: Record<VoteCategory, { label: string; icon: string }> = {
  kid:    { label: 'Kid',    icon: '🧒' },
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

export default function VoteEditor() {
  const [categoryVotes, setCategoryVotes] = useState<Record<string, VoteRow[]>>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<VoteCategory | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/votes')
    if (res.ok) {
      const d = await res.json()
      setCategoryVotes(d.categoryVotes ?? {})
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
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm">Total votes: <span className="text-yellow-400 font-semibold">{totalVotes}</span></span>
          <button onClick={fetchData} className="text-xs text-zinc-500 hover:text-white transition-colors">↻ Refresh</button>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Application ID…"
            className="bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500 w-52"
          />
          <button
            onClick={handleResetAll}
            disabled={resetting || totalVotes === 0}
            className="bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/40 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-40 transition-colors"
          >
            {resetting ? 'Resetting…' : '🔄 Reset All — let everyone vote again'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {VOTE_CATEGORIES.map(cat => {
          const meta = CAT_META[cat]
          const votes = (categoryVotes[cat] ?? []).filter(v =>
            !search || v.applicationId.toLowerCase().includes(search.toLowerCase())
          )
          const isExpanded = expanded === cat

          return (
            <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Category header */}
              <div className="flex items-center">
                <button
                  onClick={() => setExpanded(isExpanded ? null : cat)}
                  className="flex-1 px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-lg">{meta.icon}</span>
                  <div>
                    <div className="text-white font-semibold">{meta.label} Category</div>
                    <div className="text-zinc-500 text-xs mt-0.5">
                      {votes.length} vote{votes.length !== 1 ? 's' : ''}{search ? ' matching' : ''}
                    </div>
                  </div>
                  <span className="text-zinc-500 ml-auto">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {votes.length > 0 && (
                  <button
                    onClick={() => handleResetCategory(cat, (categoryVotes[cat] ?? []).length)}
                    className="mr-4 text-xs text-red-400 hover:text-red-300 border border-red-700/30 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    🔄 Reset category
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-white/10">
                  {votes.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 text-sm">
                      No votes{search ? ' matching your search' : ' yet'}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {votes.map(vote => (
                        <div key={vote.id} className="flex items-center gap-3 px-5 py-3">
                          {vote.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={vote.photo_url} alt={vote.contestantName} className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-900/40 flex items-center justify-center text-base shrink-0">👸</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium truncate">{vote.contestantName}</div>
                            <div className="text-zinc-500 text-xs font-mono truncate">{vote.applicationId}</div>
                          </div>
                          <div className="text-zinc-600 text-xs hidden sm:block shrink-0">
                            {new Date(vote.votedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <button
                            onClick={() => handleDeleteOne(vote.id, vote.applicationId)}
                            title="Delete this vote — user can vote again"
                            className="text-xs text-red-400 hover:text-red-300 border border-red-700/40 bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                          >
                            🗑️ Delete
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
    </>
  )
}
