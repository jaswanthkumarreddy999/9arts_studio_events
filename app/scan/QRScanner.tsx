'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type ScanResult = {
  valid: boolean
  name?: string
  tier?: string
  reason?: string
  applicationId?: string
  ticketNo?: string | null
  tableNumber?: string | null
  mobile?: string | null
  gender?: string | null
} | null

interface LookupRow {
  application_id: string
  full_name: string
  mobile: string
  gender: string
  seat_tier: string
}

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

  // Mode: camera scanner vs manual search
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')

  // Manual search state
  const [manualQuery, setManualQuery] = useState('')
  const [manualSearching, setManualSearching] = useState(false)
  const [manualResults, setManualResults] = useState<LookupRow[]>([])
  const [manualError, setManualError] = useState('')
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

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

  async function handleManualSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!manualQuery.trim()) return
    setManualError('')
    setManualResults([])
    setManualSearching(true)
    try {
      const res = await fetch('/api/scan/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: manualQuery.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setManualError(data.reason ?? 'No results found')
      } else if (data.multiple) {
        setManualResults(data.results)
      } else {
        setManualResults([data.result])
      }
    } catch {
      setManualError('Network error. Please try again.')
    } finally {
      setManualSearching(false)
    }
  }

  async function handleManualCheckIn(appId: string) {
    setCheckingIn(appId)
    setResult(null)
    try {
      const res = await fetch('/api/scan/manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId }),
      })
      const data = await res.json()
      setResult(data)
      setManualResults([])
      setManualQuery('')
      if (data.valid) fetchHistory()
    } catch {
      setResult({ valid: false, reason: 'Network error. Please try again.' })
    } finally {
      setCheckingIn(null)
    }
  }

  function resetManual() {
    setResult(null)
    setManualQuery('')
    setManualResults([])
    setManualError('')
  }

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

      {/* ── Mode toggle ── */}
      <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-5">
        <button
          onClick={() => { setMode('camera'); setResult(null); setManualResults([]); setManualError('') }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'camera' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}
        >
          📷 QR Scanner
        </button>
        <button
          onClick={() => { setMode('manual'); stopCamera(); setResult(null) }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'manual' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}
        >
          🔍 Manual Search
        </button>
      </div>

      {/* ── Shared result card ── */}
      {result && (
        <div className={`rounded-2xl p-6 mb-6 text-center border-2 ${result.valid ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
          <div className="text-5xl mb-3">{result.valid ? '✅' : '❌'}</div>
          {result.valid ? (
            <>
              <div className="text-green-400 font-bold text-xl mb-1">VALID PASS</div>
              <div className="text-white text-lg font-semibold">{result.name}</div>
              <div className="text-zinc-400 text-sm mt-1">{tierLabel(result.tier)}</div>

              {/* Details */}
              <div className="mt-3 bg-black/30 rounded-xl px-4 py-3 text-left space-y-1.5">
                {result.applicationId && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">App ID</span>
                    <span className="text-zinc-300 font-mono">{result.applicationId}</span>
                  </div>
                )}
                {result.mobile && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Mobile</span>
                    <span className="text-white font-semibold">{result.mobile}</span>
                  </div>
                )}
                {result.gender && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Gender</span>
                    <span className={`font-semibold ${result.gender === 'male' ? 'text-blue-300' : result.gender === 'female' ? 'text-pink-300' : 'text-purple-300'}`}>
                      {result.gender === 'male' ? '♂ Male' : result.gender === 'female' ? '♀ Female' : '⚧ Other'}
                    </span>
                  </div>
                )}
              </div>

              {/* Seat info or assign */}
              {result.ticketNo || result.tableNumber ? (
                <div className="mt-3 bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-3 text-left">
                  <div className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-2">🪑 Seat Assignment</div>
                  {result.tableNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Location</span>
                      <span className="text-white font-bold">{result.tableNumber}</span>
                    </div>
                  )}
                  {result.ticketNo && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-zinc-400">Seat</span>
                      <span className="text-cyan-400 font-mono font-bold">{result.ticketNo}</span>
                    </div>
                  )}
                </div>
              ) : (
                <SeatAssignInline
                  applicationId={result.applicationId!}
                  onAssigned={(seat, table) => {
                    setResult(r => r ? { ...r, ticketNo: seat, tableNumber: table } : r)
                  }}
                />
              )}
            </>
          ) : (
            <>
              <div className="text-red-400 font-bold text-xl mb-2">INVALID</div>
              <div className="text-zinc-300 text-sm">{result.reason}</div>
            </>
          )}
          <button
            onClick={mode === 'camera' ? resetScan : resetManual}
            className="mt-4 bg-white/10 hover:bg-white/20 text-white text-sm px-6 py-2 rounded-full transition-colors"
          >
            {mode === 'camera' ? 'Scan Next →' : 'Search Again →'}
          </button>
        </div>
      )}

      {/* ── Camera mode ── */}
      {mode === 'camera' && !result && (
        <>
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

          {error && (
            <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
          )}

          <div className="mb-4">
            {!scanning ? (
              <button onClick={startCamera} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 rounded-xl hover:from-yellow-500 hover:to-yellow-300 transition-all">
                📷 Start Scanning
              </button>
            ) : (
              <button onClick={stopCamera} className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold py-4 rounded-xl transition-colors">
                Stop Camera
              </button>
            )}
          </div>

          <p className="text-zinc-600 text-xs text-center mb-8">
            Point camera at attendee&apos;s QR code. Scanning is automatic.
          </p>
        </>
      )}

      {/* ── Manual search mode ── */}
      {mode === 'manual' && !result && (
        <div className="mb-8">
          <form onSubmit={handleManualSearch} className="space-y-3 mb-4">
            <div className="relative">
              <input
                type="text"
                value={manualQuery}
                onChange={e => { setManualQuery(e.target.value); setManualError(''); setManualResults([]) }}
                placeholder="Name, mobile number, or Application ID…"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 pr-12 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                autoFocus
              />
              {manualQuery && (
                <button type="button" onClick={() => { setManualQuery(''); setManualResults([]); setManualError('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors text-lg leading-none">
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={manualSearching || !manualQuery.trim()}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3.5 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all"
            >
              {manualSearching ? 'Searching…' : '🔍 Search'}
            </button>
          </form>

          {manualError && (
            <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm">
              {manualError}
            </div>
          )}

          {manualResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-zinc-500 text-xs uppercase tracking-wide px-1 mb-1">
                {manualResults.length === 1 ? '1 result — confirm to check in' : `${manualResults.length} results — select one`}
              </div>
              {manualResults.map(r => (
                <div key={r.application_id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{r.full_name}</div>
                    <div className="text-zinc-400 text-xs mt-0.5 font-mono">{r.application_id}</div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-zinc-500 text-xs">{r.mobile}</span>
                      <span className="text-yellow-500 text-xs">{tierLabel(r.seat_tier)}</span>
                      <span className={`text-xs ${r.gender === 'male' ? 'text-blue-300' : r.gender === 'female' ? 'text-pink-300' : 'text-purple-300'}`}>
                        {r.gender === 'male' ? '♂ Male' : r.gender === 'female' ? '♀ Female' : '⚧ Other'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleManualCheckIn(r.application_id)}
                    disabled={checkingIn === r.application_id}
                    className="shrink-0 bg-green-600 hover:bg-green-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60 transition-colors"
                  >
                    {checkingIn === r.application_id ? '…' : '✅ Check In'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!manualQuery && manualResults.length === 0 && !manualError && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-zinc-500 text-sm">Search by any of these</div>
              <div className="mt-3 space-y-1.5">
                {['Application ID  (e.g. MN-ABC123)', 'Mobile number  (e.g. 9876543210)', 'Full name  (e.g. Priya Reddy)'].map(hint => (
                  <div key={hint} className="text-zinc-600 text-xs bg-white/5 rounded-lg px-3 py-2 text-left">{hint}</div>
                ))}
              </div>
            </div>
          )}

          <p className="text-zinc-600 text-xs text-center mt-4">
            Use this when the QR scanner is not working or the attendee lost their pass.
          </p>
        </div>
      )}


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


// ─── Inline seat assign (shown when no seat assigned at scan time) ─────────────

function SeatAssignInline({ applicationId, onAssigned }: {
  applicationId: string
  onAssigned: (seat: string, table: string) => void
}) {
  const [seatType, setSeatType] = useState<'sofa' | 'table' | 'chair'>('table')
  const [seat, setSeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState({ sofa_count: 20, sofa_capacity: 2, round_table_count: 20, round_table_capacity: 6, chair_count: 250, chairs_per_row: 10 })
  const [tableLabel, setTableLabel] = useState('')

  useEffect(() => {
    fetch('/api/admin/seating/config').then(r => r.ok ? r.json() : null).then(d => { if (d?.config) setConfig(d.config) }).catch(() => {})
  }, [])

  function handleSeatChange(val: string) {
    setSeat(val)
    // Derive table label from selection
    if (seatType === 'table') {
      const match = val.match(/^T(\d+)-/)
      setTableLabel(match ? `Table ${match[1]}` : '')
    } else if (seatType === 'sofa') {
      const match = val.match(/^S(\d+)-/)
      setTableLabel(match ? `Sofa ${match[1]}` : '')
    } else {
      const num = parseInt(val.replace('C', ''))
      setTableLabel(isNaN(num) ? '' : `Row ${Math.ceil(num / (config.chairs_per_row || 10))}`)
    }
  }

  async function handleAssign() {
    if (!seat) return
    setSaving(true)
    const res = await fetch('/api/admin/seating/assign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, seatLabel: seat, tableLabel }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); onAssigned(seat, tableLabel) }
  }

  if (saved) {
    return (
      <div className="mt-3 bg-green-900/20 border border-green-700/40 rounded-xl px-4 py-3">
        <div className="text-green-400 text-sm font-semibold">✅ Seat assigned</div>
        <div className="text-zinc-400 text-xs mt-0.5">{tableLabel} · Seat {seat}</div>
      </div>
    )
  }

  return (
    <div className="mt-3 bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-left space-y-3">
      <div className="text-amber-400 text-xs font-semibold uppercase tracking-wide">⚠️ No seat assigned — assign now</div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {([['sofa', '🛋️ Sofa'], ['table', '🪑 Table'], ['chair', '💺 Chair']] as const).map(([type, label]) => (
          <button key={type} type="button" onClick={() => { setSeatType(type); setSeat(''); setTableLabel('') }}
            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${seatType === type ? 'border-yellow-500 bg-yellow-900/20 text-yellow-300' : 'border-white/10 text-zinc-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Seat dropdown */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Select Seat</label>
        <select value={seat} onChange={e => handleSeatChange(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 appearance-none"
          style={{ colorScheme: 'dark' }}>
          <option value="">— Choose a seat —</option>
          {seatType === 'table' && Array.from({ length: config.round_table_count }, (_, i) => (
            <optgroup key={i} label={`Table ${i + 1}`}>
              {Array.from({ length: config.round_table_capacity }, (_, s) => {
                const lbl = `T${i + 1}-${s + 1}`
                return <option key={lbl} value={lbl}>{lbl}</option>
              })}
            </optgroup>
          ))}
          {seatType === 'sofa' && Array.from({ length: config.sofa_count }, (_, i) => (
            <optgroup key={i} label={`Sofa ${i + 1}`}>
              {Array.from({ length: config.sofa_capacity }, (_, s) => {
                const lbl = `S${i + 1}-${s + 1}`
                return <option key={lbl} value={lbl}>{lbl}</option>
              })}
            </optgroup>
          ))}
          {seatType === 'chair' && Array.from({ length: Math.ceil(config.chair_count / (config.chairs_per_row || 10)) }, (_, r) => (
            <optgroup key={r} label={`Row ${r + 1}`}>
              {Array.from({ length: Math.min(config.chairs_per_row || 10, config.chair_count - r * (config.chairs_per_row || 10)) }, (_, s) => {
                const num = r * (config.chairs_per_row || 10) + s + 1
                const lbl = `C${num}`
                return <option key={lbl} value={lbl}>{lbl}</option>
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Preview */}
      {seat && tableLabel && (
        <div className="bg-black/30 rounded-lg px-3 py-2 text-xs text-zinc-400">
          📍 {tableLabel.toUpperCase()} · SEAT {seat}
        </div>
      )}

      <button onClick={handleAssign} disabled={saving || !seat}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors">
        {saving ? 'Saving…' : '💾 Assign Seat'}
      </button>
      <button onClick={() => setSaved(true)}
        className="w-full text-zinc-500 hover:text-zinc-300 text-xs py-1 transition-colors">
        Skip for now
      </button>
    </div>
  )
}
