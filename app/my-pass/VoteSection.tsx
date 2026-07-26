'use client'

import { useState, useEffect } from 'react'

interface Contestant {
  id: string
  name: string
  tagline?: string
  category?: string
  photo_url?: string
  display_order: number
}

export default function VoteSection() {
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [currentVote, setCurrentVote] = useState<string | null>(null)
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [message, setMessage] = useState('')
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
        if (voteData.vote?.contestant_id) {
          setCurrentVote(voteData.vote.contestant_id)
        }
      }

      if (contestantRes.ok) {
        const data = await contestantRes.json()
        setContestants(data.contestants ?? [])
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleVote(contestantId: string) {
    if (voting) return
    setVoting(true)
    setMessage('')
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestantId }),
    })
    const data = await res.json()
    if (res.ok) {
      setCurrentVote(contestantId)
      setMessage(`✅ Voted for ${data.contestantName}! You can change your vote anytime.`)
    } else {
      setMessage(`❌ ${data.error}`)
    }
    setVoting(false)
  }

  if (loading) return null

  if (!eligible) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗳️</span>
          <div>
            <div className="text-white font-semibold text-sm">Vote for Your Favourite</div>
            <div className="text-zinc-500 text-xs mt-0.5">Available after your payment is approved</div>
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
            <div className="text-white font-semibold text-sm">Vote for Your Favourite</div>
            <div className="text-zinc-500 text-xs mt-0.5">
              {currentVote ? '✅ You have voted — tap to change' : 'Cast your vote for a contestant'}
            </div>
          </div>
        </div>
        <span className="text-zinc-500 text-lg">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 bg-white/5 border border-white/10 rounded-2xl p-4">
          {message && (
            <div className={`text-sm rounded-xl px-4 py-3 mb-4 ${message.startsWith('✅') ? 'bg-green-900/20 border border-green-700/40 text-green-400' : 'bg-red-900/20 border border-red-700/40 text-red-400'}`}>
              {message}
            </div>
          )}

          {contestants.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-4">Contestants not announced yet</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {contestants.map((c) => {
                const isVoted = currentVote === c.id
                return (
                  <button key={c.id} onClick={() => handleVote(c.id)} disabled={voting}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${isVoted ? 'border-yellow-500 bg-yellow-900/20' : 'border-white/10 bg-white/5 hover:border-yellow-700/50'}`}>
                    <div className="aspect-[3/4] relative">
                      {c.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-yellow-900/20 flex items-center justify-center text-4xl">👸</div>
                      )}
                      {isVoted && (
                        <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                          <div className="bg-yellow-500 rounded-full w-10 h-10 flex items-center justify-center text-black text-xl font-bold">✓</div>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="text-white text-xs font-semibold">{c.name}</div>
                      {c.category && <div className="text-yellow-500 text-xs mt-0.5">{c.category}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
