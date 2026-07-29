'use client'

import { useRouter } from 'next/navigation'

export default function PassActions({ hasPass: _hasPass }: { hasPass: boolean }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-zinc-400 hover:text-red-400 text-sm transition-colors"
    >
      Logout
    </button>
  )
}
