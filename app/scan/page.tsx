import QRScanner from './QRScanner'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function ScanPage() {
  const session = await getSession()
  if (!session) return null

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <header className="bg-black/60 border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">👑</span>
          <span className="font-bold text-white text-sm">Gate Scanner</span>
        </div>
        <Link href="/admin" className="text-zinc-400 hover:text-white text-sm transition-colors">
          ← Dashboard
        </Link>
      </header>
      <QRScanner />
    </div>
  )
}
