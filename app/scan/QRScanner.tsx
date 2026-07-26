'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type ScanResult = {
  valid: boolean
  name?: string
  tier?: string
  reason?: string
} | null

interface ScanLog {
  id: string
  application_id: string
  scanned_at: string
  registrations: {
    full_name: string
    seat_tier: string
    mobile: string
    gender?: string
  } | null
}

interface ScanStats {
  total: number
  elite: number; gold: number
  male: number; female: number; other: number
  male_elite: number; male_gold: number
  female_elite: number; female_gold: number
  other_elite: number; other_gold: number
}

export default function QRScanner() {
  const [result, setResult] = useState<ScanResult>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [scanCount, setScanCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

  // History state
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const fetchHistory = useCallback(async (search = '') => {
    setHistoryLoading(true)
    const res = await fetch(`/api/scan/history?q=${encodeURIComponent(search)}`)
    if (res.ok) {
      const d = await res.json()
      setLogs(d.logs ?? [])
      setStats(d.stats ?? null)
      setScanCount(d.stats?.total ?? 0)
    }
    setHistoryLoading(false)
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      scanningRef.current = true
      scanFrames()
    } catch {
      setError('Camera access denied. Please allow camera permission and try again.')
    }
  }

  function stopCamera() {
    scanningRef.current = false
    setScanning(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function scanFrames() {
    if (!scanningRef.current || !videoRef.current) return

    if ('BarcodeDetector' in window) {
      const detector = new (window as unknown as { BarcodeDetector: new (opts: object) => { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ['qr_code'] })
      const loop = async () => {
        if (!scanningRef.current || !videoRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) { await processQR(barcodes[0].rawValue); return }
        } catch { /* ignore */ }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    } else {
      try {
        const jsQR = (await import('jsqr')).default
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const loop = () => {
          if (!scanningRef.current || !videoRef.current) return
          const v = videoRef.current
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight
            ctx.drawImage(v, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height)
            if (code) { processQR(code.data); return }
          }
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      } catch {
        setError('QR scanning not supported on this browser. Try Chrome on Android.')
        stopCamera()
      }
    }
  }

  async function processQR(raw: string) {
    scanningRef.current = false
    setScanning(false)
    let payload: unknown
    try { payload = JSON.parse(raw) } catch {
      setResult({ valid: false, reason: 'Invalid QR format' }); return
    }
    try {
      const res = await fetch('/api/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setResult(data)
      if (data.valid) fetchHistory()
    } catch {
      setResult({ valid: false, reason: 'Network error. Please try again.' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this scan record? The person will be able to enter again.')) return
    setDeletingId(id)
    await fetch('/api/scan/history', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeletingId(null)
    fetchHistory(historySearch)
  }

  function resetScan() { setResult(null); startCamera() }

  useEffect(() => {
    return () => { scanningRef.current = false; stopCamera() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tierLabel = (tier?: string) => tier === 'elite' ? '👑 Elite' : '⭐ Gold'

  const filteredLogs = historySearch
    ? logs.filter(l =>
        l.application_id.toLowerCase().includes(historySearch.toLowerCase()) ||
        l.registrations?.full_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        l.registrations?.mobile.includes(historySearch)
      )
    : logs
  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      {/* Stats dashboard */}
      <div className="mb-6 space-y-3">
        {/* Total */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
          <div className="text-3xl font-bold text-white">{scanCount}</div>
          <div className="text-zinc-500 text-sm">Total Attendees Entered</div>
        </div>

        {/* Elite / Gold split */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-3 py-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.elite}</div>
              <div className="text-amber-600 text-xs mt-0.5">👑 Elite</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-3 py-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.gold}</div>
              <div className="text-yellow-600 text-xs mt-0.5">⭐ Gold</div>
            </div>
          </div>
        )}

        {/* Gender × Tier breakdown */}
        {stats && stats.total > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-xs text-zinc-500 uppercase tracking-wide font-semibold">
              Breakdown
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-3 py-2 text-zinc-600 text-xs font-medium">Gender</th>
                  <th className="text-center px-3 py-2 text-amber-600 text-xs font-medium">👑 Elite</th>
                  <th className="text-center px-3 py-2 text-yellow-600 text-xs font-medium">⭐ Gold</th>
                  <th className="text-center px-3 py-2 text-zinc-400 text-xs font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-3 py-2 text-blue-300 text-xs">♂ Male</td>
                  <td className="px-3 py-2 text-center text-white text-xs font-medium">{stats.male_elite}</td>
                  <td className="px-3 py-2 text-center text-white text-xs font-medium">{stats.male_gold}</td>
                  <td className="px-3 py-2 text-center text-zinc-300 text-xs font-bold">{stats.male}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-pink-300 text-xs">♀ Female</td>
                  <td className="px-3 py-2 text-center text-white text-xs font-medium">{stats.female_elite}</td>
                  <td className="px-3 py-2 text-center text-white text-xs font-medium">{stats.female_gold}</td>
                  <td className="px-3 py-2 text-center text-zinc-300 text-xs font-bold">{stats.female}</td>
                </tr>
                {stats.other > 0 && (
                  <tr>
                    <td className="px-3 py-2 text-purple-300 text-xs">⚧ Other</td>
                    <td className="px-3 py-2 text-center text-white text-xs font-medium">{stats.other_elite}</td>
                    <td className="px-3 py-2 text-center text-white text-xs font-medium">{stats.other_gold}</td>
                    <td className="px-3 py-2 text-center text-zinc-300 text-xs font-bold">{stats.other}</td>
                  </tr>
                )}
                <tr className="bg-white/5">
                  <td className="px-3 py-2 text-zinc-400 text-xs font-semibold">Total</td>
                  <td className="px-3 py-2 text-center text-amber-400 text-xs font-bold">{stats.elite}</td>
                  <td className="px-3 py-2 text-center text-yellow-400 text-xs font-bold">{stats.gold}</td>
                  <td className="px-3 py-2 text-center text-white text-xs font-bold">{stats.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl p-6 mb-6 text-center border-2 ${result.valid ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
          <div className="text-5xl mb-3">{result.valid ? '✅' : '❌'}</div>
          {result.valid ? (
            <>
              <div className="text-green-400 font-bold text-xl mb-1">VALID PASS</div>
              <div className="text-white text-lg font-semibold">{result.name}</div>
              <div className="text-zinc-400 text-sm mt-1">{tierLabel(result.tier)}</div>
            </>
          ) : (
            <>
              <div className="text-red-400 font-bold text-xl mb-2">INVALID</div>
              <div className="text-zinc-300 text-sm">{result.reason}</div>
            </>
          )}
          <button onClick={resetScan} className="mt-4 bg-white/10 hover:bg-white/20 text-white text-sm px-6 py-2 rounded-full transition-colors">
            Scan Next →
          </button>
        </div>
      )}

      {/* Camera */}
      {!result && (
        <div className="relative bg-black rounded-2xl overflow-hidden border border-white/10 aspect-square mb-4">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-yellow-400/60 rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
                <div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-400/80 animate-[scan_2s_linear_infinite]" />
              </div>
            </div>
          )}
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <div className="text-4xl mb-2">📷</div>
                <div className="text-zinc-400 text-sm">Camera not active</div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {!result && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {!scanning ? (
            <button onClick={startCamera} className="col-span-2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 rounded-xl hover:from-yellow-500 hover:to-yellow-300 transition-all">
              📷 Start Scanning
            </button>
          ) : (
            <button onClick={stopCamera} className="col-span-2 bg-red-700 hover:bg-red-600 text-white font-semibold py-4 rounded-xl transition-colors">
              Stop Camera
            </button>
          )}
        </div>
      )}

      <p className="text-zinc-600 text-xs text-center mb-8">
        Point camera at attendee&apos;s QR code. Scanning is automatic.
      </p>

      {/* ── SCAN HISTORY ── */}
      <div className="border border-white/10 rounded-2xl overflow-hidden">
        {/* History header */}
        <button
          onClick={() => setShowHistory(h => !h)}
          className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">📋 Entry History</span>
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-semibold">{logs.length}</span>
          </div>
          <span className="text-zinc-500 text-sm">{showHistory ? '▲' : '▼'}</span>
        </button>

        {showHistory && (
          <div>
            {/* Search */}
            <div className="px-4 py-3 border-t border-white/10">
              <input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search name, mobile or application ID…"
                className="w-full bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>

            {/* Log list */}
            {historyLoading ? (
              <div className="text-center py-6 text-zinc-500 text-sm">Loading…</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-sm">
                {historySearch ? 'No matching records' : 'No entries yet'}
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                {filteredLogs.map(log => {
                  const reg = log.registrations
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {reg?.full_name ?? log.application_id}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-zinc-500 text-xs font-mono truncate">{log.application_id}</span>
                          {reg?.seat_tier && (
                            <span className="text-yellow-500 text-xs shrink-0">{tierLabel(reg.seat_tier)}</span>
                          )}
                        </div>
                        <div className="text-zinc-600 text-xs mt-0.5">
                          {new Date(log.scanned_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        title="Remove entry — allows re-scan"
                        className="text-xs text-red-400 hover:text-red-300 border border-red-700/40 bg-red-900/20 px-2 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                      >
                        {deletingId === log.id ? '…' : '🗑️'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="px-4 py-2 border-t border-white/5 flex justify-end">
              <button onClick={() => fetchHistory(historySearch)} className="text-xs text-zinc-500 hover:text-white transition-colors">
                ↻ Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
