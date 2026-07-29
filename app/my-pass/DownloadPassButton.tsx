'use client'

import { useState } from 'react'

export default function DownloadPassButton() {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/pass/download')
      if (!res.ok) { alert('Pass not ready yet.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'MissNellore2026-Pass.png'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-500 hover:to-yellow-300 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl text-sm transition-all"
    >
      {downloading ? (
        <>⏳ Preparing your pass…</>
      ) : (
        <>⬇️ Download Pass as Image</>
      )}
    </button>
  )
}
