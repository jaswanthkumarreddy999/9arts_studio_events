'use client'

import { useState, useEffect, useRef } from 'react'

type ScanResult = {
  valid: boolean
  name?: string
  tier?: string
  reason?: string
} | null

export default function QRScanner() {
  const [result, setResult] = useState<ScanResult>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [scanCount, setScanCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

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

    // Use BarcodeDetector if available (Chrome 88+, Chrome on Android)
    if ('BarcodeDetector' in window) {
      const detector = new (window as unknown as { BarcodeDetector: new (opts: object) => { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ['qr_code'] })

      const loop = async () => {
        if (!scanningRef.current || !videoRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            await processQR(barcodes[0].rawValue)
            return
          }
        } catch { /* ignore */ }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    } else {
      // Fallback: canvas + jsQR (loaded dynamically)
      try {
        const jsQR = (await import('jsqr')).default
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        const loop = () => {
          if (!scanningRef.current || !videoRef.current) return
          const v = videoRef.current
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth
            canvas.height = v.videoHeight
            ctx.drawImage(v, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height)
            if (code) {
              processQR(code.data)
              return
            }
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
    try {
      payload = JSON.parse(raw)
    } catch {
      setResult({ valid: false, reason: 'Invalid QR format' })
      return
    }

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setResult(data)
      if (data.valid) setScanCount(c => c + 1)
    } catch {
      setResult({ valid: false, reason: 'Network error. Please try again.' })
    }
  }

  function resetScan() {
    setResult(null)
    startCamera()
  }

  useEffect(() => {
    return () => {
      scanningRef.current = false
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tierLabel = (tier?: string) => tier === 'elite' ? '👑 Elite — Front Seats' : '⭐ Gold — Back Seats'

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      {/* Counter */}
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 text-center">
        <div className="text-3xl font-bold text-white">{scanCount}</div>
        <div className="text-zinc-500 text-sm">Attendees scanned today</div>
      </div>

      {/* Result overlay */}
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
                {/* Scanning line animation */}
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
        <div className="grid grid-cols-2 gap-3">
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

      <p className="text-zinc-600 text-xs text-center mt-4">
        Point camera at attendee&apos;s QR code. Scanning is automatic.
      </p>
    </div>
  )
}
