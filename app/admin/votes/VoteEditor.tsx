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

interface Contestant {
  id: string
  name: string
  contestant_category: VoteCategory
  photo_url?: string
}

export default function VoteEditor() {
  const [categoryVotes, setCategoryVotes] = useState<Record<string, VoteRow[]>>({})
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<VoteCategory | null>(null)
  const [editingVote, setEditingVote] = useState<VoteRow | null>(null)
  const [newContestantId, setNewContestantId] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [votesRes, contestantsRes] = await Promise.all([
      fetch('/api/admin/votes'),
      fetch('/api/admin/contestants'),
    ])
    if (votesRes.ok) {
      const d = await votesRes.json()
      setCategoryVotes(d.categoryVotes ?? {})
    }
    if (contestantsRes.ok) {
      const d = await contestantsRes.json()
      setContestants(d.contestants ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(voteId: string) {
    if (!confirm('Delete this vote? This cannot be undone.')) return
    await fetch(`/api/admin/votes/${voteId}`, { method: 'DELETE' })
    fetchData()
  }

  async function handleReassign(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVote || !newContestantId) return
    setSaving(true)
    await fetch(`/api/admin/votes/${editingVote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestantId: newContestantId }),
    })
    setSaving(false)
    setEditingVote(null)
    setNewContestantId('')
    fetchData()
  }

  function openEdit(vote: VoteRow) {
    setEditingVote(vote)
    setNewContestantId(vote.contestantId)
  }

  if (loading) {
    return <div className="text-center py-20 text-zinc-500">Loading votes...</div>
  }

  const totalVotes = Object.values(categoryVotes).reduce((s, v) => s + v.length, 0)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-400 text-sm">Total votes: <span className="text-yellow-400 font-semibold">{totalVotes}</span></span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by Application ID…"
          className="bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500 w-52"
        />
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
              {/* Header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : cat)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{meta.icon}</span>
                  <div className="text-left">
                    <div className="text-white font-semibold">{meta.label} Category</div>
                    <div className="text-zinc-500 text-xs mt-0.5">{votes.length} vote{votes.length !== 1 ? 's' : ''}{search ? ' matching' : ''}</div>
                  </div>
                </div>
                <span className="text-zinc-500">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-white/10">
                  {votes.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 text-sm">No votes{search ? ' matching your search' : ''}</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {votes.map(vote => (
                        <div key={vote.id} className="flex items-center gap-3 px-5 py-3">
                          {/* Contestant photo */}
                          {vote.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={vote.photo_url} alt={vote.contestantName} className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-900/40 flex items-center justify-center text-base shrink-0">👸</div>
                          )}

                          {/* Vote info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium truncate">{vote.contestantName}</div>
                            <div className="text-zinc-500 text-xs font-mono truncate">{vote.applicationId}</div>
                          </div>

                          {/* Voted at */}
                          <div className="text-zinc-600 text-xs hidden sm:block shrink-0">
                            {new Date(vote.votedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => openEdit(vote)}
                              className="text-xs text-blue-400 hover:text-blue-300 border border-blue-700/40 bg-blue-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              ✏️ Reassign
                            </button>
                            <button
                              onClick={() => handleDelete(vote.id)}
                              className="text-xs text-red-400 hover:text-red-300 border border-red-700/40 bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
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

      {/* Reassign Modal */}
      {editingVote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditingVote(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Reassign Vote</h3>
              <button onClick={() => setEditingVote(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleReassign} className="p-5 space-y-4">
              <div className="bg-white/5 rounded-xl px-4 py-3 text-sm space-y-1">
                <div className="text-zinc-400">Voter: <span className="text-white font-mono">{editingVote.applicationId}</span></div>
                <div className="text-zinc-400">Category: <span className="text-white capitalize">{editingVote.category}</span></div>
                <div className="text-zinc-400">Current vote: <span className="text-yellow-400">{editingVote.contestantName}</span></div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-2">Reassign to:</label>
                <select
                  value={newContestantId}
                  onChange={e => setNewContestantId(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
                  style={{ colorScheme: 'dark' }}
                >
                  {contestants
                    .filter(c => c.contestant_category === editingVote.category)
                    .map(c => (
                      <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                        {c.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingVote(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-zinc-400 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving || newContestantId === editingVote.contestantId}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-yellow-500 hover:bg-yellow-400 text-black font-bold disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
