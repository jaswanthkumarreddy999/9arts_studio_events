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
  // Map: category -> contestant_id
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null) // category being voted on
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState(false)

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

  async function handleVote(contestantId: string, category: VoteCategory) {
    if (voting) return
    setVoting(category)
    setMessages(m => ({ ...m, [category]: '' }))

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestantId, category }),
    })
    const data = await res.json()

    if (res.ok) {
      setVotes(v => ({ ...v, [category]: contestantId }))
      setMessages(m => ({ ...m, [category]: `✅ Voted for ${data.contestantName}! You can change anytime.` }))
    } else {
      setMessages(m => ({ ...m, [category]: `❌ ${data.error}` }))
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
    <div className="mt-6">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full bg-white/5 border border-yellow-700/40 rounded-2xl p-5 flex items-center justify-between hover:border-yellow-600/60 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗳️</span>
          <div className="text-left">
            <div className="text-white font-semibold text-sm">Vote for Your Favourites</div>
            <div className="text-zinc-500 text-xs mt-0.5">
              {totalVoted === totalCategories
                ? `✅ All ${totalCategories} votes cast — tap to change`
                : totalVoted > 0
                ? `${totalVoted} of ${totalCategories} categories voted`
                : `1 vote per category · ${totalCategories} categories`}
            </div>
          </div>
        </div>
        <span className="text-zinc-500 text-lg">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {categoriesWithContestants.map(cat => {
            const meta = CATEGORY_META[cat]
            const catContestants = contestants.filter(c => c.contestant_category === cat)
            const currentVoteId = votes[cat]
            const msg = messages[cat]

            return (
              <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold text-sm">{meta.icon} {meta.label}</span>
                    {currentVoteId && <span className="ml-2 text-green-400 text-xs">✅ Voted</span>}
                  </div>
                  <span className="text-zinc-600 text-xs">{catContestants.length} contestant{catContestants.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="p-4">
                  {msg && (
                    <div className={`text-xs rounded-lg px-3 py-2 mb-3 ${msg.startsWith('✅') ? 'bg-green-900/20 border border-green-700/40 text-green-400' : 'bg-red-900/20 border border-red-700/40 text-red-400'}`}>
                      {msg}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {catContestants.map(c => {
                      const isVoted = currentVoteId === c.id
                      return (
                        <button key={c.id} onClick={() => handleVote(c.id, cat)} disabled={voting !== null}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${isVoted ? 'border-yellow-500 bg-yellow-900/20' : 'border-white/10 bg-white/5 hover:border-yellow-700/50'} disabled:opacity-60`}>
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
  )
}
