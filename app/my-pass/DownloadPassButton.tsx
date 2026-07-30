'use client'

import { useState } from 'react'

export default function DownloadPassButton() {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch('/api/pass/download')
      if (!res.ok) {
        const text = await res.text()
        alert(`Could not download pass: ${text}`)
        return
      }
      const blob = await res.blob()
      if (!blob || blob.size === 0) {
        alert('Pass image could not be generated. Please try again.')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'MissNellore2026-Pass.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('Download error:', err)
      alert('Download failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-500 hover:to-yellow-300 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl text-sm transition-all"
    >
      {loading ? '⏳ Generating pass…' : '⬇️ Download Pass as Image'}
    </button>
  )
}
