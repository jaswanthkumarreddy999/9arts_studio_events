import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VoteEditor from './VoteEditor'

export default async function AdminVotesPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/admin/login')

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <header className="bg-black/60 border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-zinc-400 hover:text-white transition-colors text-sm">← Back to Dashboard</Link>
            <span className="text-zinc-700">|</span>
            <span className="text-white font-semibold text-sm">🗳️ Edit Votes</span>
          </div>
          <span className="text-zinc-500 text-xs">Admin: {session.name}</span>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Vote Management</h1>
          <p className="text-zinc-500 text-sm mt-1">View, reassign or delete individual votes. Use with caution.</p>
        </div>
        <VoteEditor />
      </div>
    </div>
  )
}
