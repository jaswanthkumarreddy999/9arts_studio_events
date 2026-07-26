'use client'

import { useState, useEffect } from 'react'

type VoteCategory = 'kid' | 'teen' | 'miss' | 'misses'

const CATEGORY_META: Record<VoteCategory, { label: string; icon: string; desc: string }> = {
  kid:    { label: 'Little', icon: '🧒', desc: 'Vote for your favourite Little contestant' },
  teen:   { label: 'Teen',   icon: '👧', desc: 'Vote for your favourite Teen contestant' },
  miss:   { label: 'Miss',   icon: '👩', desc: 'Vote for your favourite Miss contestant' },
  misses: { label: 'Misses', icon: '👑', desc: 'Vote for your favourite Misses contestant' },
}

interface Contestant {
  id: string
  name: string
  tagline?: string
  category?: string
  contestant_category: VoteCategory
  photo_url?: string
  display_order: number
}

export default function VoteSection() {
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Confirmation modal state
  const [confirm, setConfirm] = useState<{ contestantId: string; contestantName: string; category: VoteCategory } | null>(null)

  useEffect(() => {
    async function load() {
      const [voteRes, contestantRes] = await Promise.all([
        fetch('/api/vote'),
        fetch('/api/contestants'),
      ])
      if (voteRes.ok) {
        const voteData = await voteRes.json()
        setEligible(voteData.eligible ?? false)
        setVotes(voteData.votes ?? {})
      }
      if (contestantRes.ok) {
        const data = await contestantRes.json()
        setContestants(data.contestants ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  function requestVote(contestantId: string, contestantName: string, category: VoteCategory) {
    if (voting || votes[category]) return // already voted — block
    setConfirm({ contestantId, contestantName, category })
  }

  async function confirmVote() {
    if (!confirm) return
    const { contestantId, category } = confirm
    setConfirm(null)
    setVoting(category)

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestantId, category }),
    })
    const data = await res.json()

    if (res.ok) {
      setVotes(v => ({ ...v, [category]: contestantId }))
    } else {
      alert(data.error ?? 'Vote failed')
    }
    setVoting(null)
  }

  if (loading) return null

  const categoriesWithContestants = (['kid', 'teen', 'miss', 'misses'] as VoteCategory[]).filter(
    cat => contestants.some(c => c.contestant_category === cat)
  )

  const totalVoted = Object.keys(votes).length
  const totalCategories = categoriesWithContestants.length

  if (!eligible) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗳️</span>
          <div>
            <div className="text-white font-semibold text-sm">Vote for Your Favourites</div>
            <div className="text-zinc-500 text-xs mt-0.5">Available after your payment is approved — 1 vote per category (4 total)</div>
          </div>
        </div>
      </div>
    )
  }

  if (categoriesWithContestants.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗳️</span>
          <div>
            <div className="text-white font-semibold text-sm">Voting opens soon</div>
            <div className="text-zinc-500 text-xs mt-0.5">Contestants will be announced shortly</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mt-6">
        <button onClick={() => setExpanded(e => !e)}
          className="w-full bg-white/5 border border-yellow-700/40 rounded-2xl p-5 flex items-center justify-between hover:border-yellow-600/60 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗳️</span>
            <div className="text-left">
              <div className="text-white font-semibold text-sm">Vote for Your Favourites</div>
              <div className="text-zinc-500 text-xs mt-0.5">
                {totalVoted === totalCategories
                  ? `✅ All ${totalCategories} votes cast — votes are final`
                  : totalVoted > 0
                  ? `${totalVoted} of ${totalCategories} categories voted — votes are final once cast`
                  : `1 vote per category · ${totalCategories} categories · votes are final`}
              </div>
            </div>
          </div>
          <span className="text-zinc-500 text-lg">{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-4">
            {/* Warning banner */}
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-amber-400 text-base mt-0.5">⚠️</span>
              <div className="text-amber-300 text-xs leading-relaxed">
                <span className="font-semibold">Votes are final.</span> Once you vote in a category, it cannot be changed. Choose carefully.
              </div>
            </div>

            {categoriesWithContestants.map(cat => {
              const meta = CATEGORY_META[cat]
              const catContestants = contestants.filter(c => c.contestant_category === cat)
              const currentVoteId = votes[cat]
              const hasVoted = !!currentVoteId
              const votedFor = catContestants.find(c => c.id === currentVoteId)

              return (
                <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{meta.icon} {meta.label}</span>
                      {hasVoted && <span className="text-green-400 text-xs">✅ Voted · Final</span>}
                    </div>
                    <span className="text-zinc-600 text-xs">{catContestants.length} contestant{catContestants.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="p-4">
                    {hasVoted && votedFor && (
                      <div className="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                        <span className="text-green-400 text-xs font-semibold">✅ You voted for {votedFor.name}</span>
                        <span className="text-zinc-500 text-xs">— This vote is final</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {catContestants.map(c => {
                        const isVoted = currentVoteId === c.id
                        const isLocked = hasVoted && !isVoted // voted for someone else — lock all others
                        return (
                          <button
                            key={c.id}
                            onClick={() => requestVote(c.id, c.name, cat)}
                            disabled={voting !== null || isLocked || isVoted}
                            className={`relative rounded-xl overflow-hidden border-2 transition-all text-left
                              ${isVoted ? 'border-yellow-500 bg-yellow-900/20' : ''}
                              ${isLocked ? 'border-white/5 bg-white/3 opacity-40 cursor-not-allowed' : ''}
                              ${!hasVoted ? 'border-white/10 bg-white/5 hover:border-yellow-700/50 cursor-pointer' : ''}
                            `}
                          >
                            <div className="aspect-[3/4] relative">
                              {c.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-yellow-900/20 flex items-center justify-center text-4xl">👸</div>
                              )}
                              {isVoted && (
                                <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                                  <div className="bg-yellow-500 rounded-full w-9 h-9 flex items-center justify-center text-black text-lg font-bold">✓</div>
                                </div>
                              )}
                              {voting === cat && !isVoted && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="text-white text-xs">…</div>
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <div className="text-white text-xs font-semibold leading-tight">{c.name}</div>
                              {c.category && <div className="text-yellow-500 text-xs mt-0.5">{c.category}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="text-4xl">🗳️</div>
            <h3 className="text-white font-bold text-lg">Confirm Your Vote</h3>
            <p className="text-zinc-300 text-sm">
              You are voting for <span className="text-yellow-400 font-semibold">{confirm.contestantName}</span> in the <span className="text-white font-semibold">{CATEGORY_META[confirm.category].label}</span> category.
            </p>
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3">
              <p className="text-red-300 text-xs font-semibold">⚠️ This vote is final and cannot be changed.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVote}
                className="flex-1 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors"
              >
                Confirm Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
