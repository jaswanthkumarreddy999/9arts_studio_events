'use client'

import { useState } from 'react'

interface Props {
  applicationId: string
  amount: number
  utrNumber: string | null   // existing UTR if already submitted
  hasScreenshot: boolean     // whether screenshot was already uploaded
}

export default function PaymentSubmit({ applicationId, amount, utrNumber: initialUtr, hasScreenshot }: Props) {
  const [utr, setUtr] = useState(initialUtr ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [expanded, setExpanded] = useState(!initialUtr) // auto-open if UTR not submitted yet

  const alreadySubmitted = !!initialUtr

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!utr.trim()) { setError('Please enter your UTR / Transaction ID'); return }
    setError('')
    setSubmitting(true)

    try {
      let screenshotPath = ''

      if (file) {
        // Upload screenshot directly via server-side route
        setUploading(true)
        const fd = new FormData()
        fd.append('applicationId', applicationId)
        fd.append('file', file)
        const uploadRes = await fetch('/api/payment/upload-url', { method: 'POST', body: fd })
        const uploadData = await uploadRes.json()
        setUploading(false)
        if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')
        screenshotPath = uploadData.path
      }

      const res = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, utrNumber: utr.trim(), screenshotPath }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Submission failed')
      }

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-green-900/20 border border-green-700/40 rounded-2xl p-5 mt-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="text-green-400 font-semibold text-sm">Payment Details Submitted</div>
            <div className="text-zinc-400 text-xs mt-0.5">We'll verify within 24 hours and generate your QR pass.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 border border-yellow-700/30 rounded-2xl overflow-hidden">
      {/* Header — tap to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 flex items-center justify-between bg-yellow-900/10 hover:bg-yellow-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">💳</span>
          <div className="text-left">
            <div className="text-yellow-400 font-semibold text-sm">
              {alreadySubmitted ? 'Update Payment Details' : 'Complete Your Payment'}
            </div>
            <div className="text-zinc-500 text-xs mt-0.5">
              {alreadySubmitted
                ? `UTR on file: ${initialUtr} — tap to update`
                : `₹${amount} due · Add UTR number to get verified`}
            </div>
          </div>
        </div>
        <span className="text-zinc-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-black/20">
          {/* Amount reminder */}
          <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3">
            <span className="text-zinc-400">Amount to Pay</span>
            <span className="text-yellow-400 font-bold text-lg">₹{amount}</span>
          </div>

          {/* QR + UPI ID */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-zinc-400">Scan to pay via PhonePe / any UPI app</div>
            <div className="bg-white p-2 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payment-qr.png" alt="PhonePe QR" className="w-36 h-36" />
            </div>
            {/* UPI deep link button */}
            <a
              href={`upi://pay?pa=${encodeURIComponent('9346039342@ibl')}&pn=${encodeURIComponent('9 Arts Studio')}&am=${amount}&cu=INR`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              📱 Pay ₹{amount} via UPI App
            </a>
            <div className="text-xs text-zinc-500">Opens PhonePe / GPay / Paytm based on your preference</div>
            <div className="inline-flex items-center gap-2 bg-black/40 border border-yellow-700/30 rounded-lg px-3 py-1.5">
              <span className="text-yellow-400 font-mono font-bold text-sm">9346039342@ibl</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText('9346039342@ibl')}
                className="text-zinc-500 hover:text-yellow-400 text-xs transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* UTR input */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              UTR / Transaction ID *
            </label>
            <input
              type="text"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              placeholder="Enter UTR number from your UPI app"
              className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
            />
            <p className="text-zinc-600 text-xs mt-1">Find this in your UPI payment history / transaction details</p>
          </div>

          {/* Screenshot upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Payment Screenshot{' '}
              <span className="text-zinc-500 font-normal">
                ({hasScreenshot ? 'already uploaded — upload new to replace' : 'optional but recommended'})
              </span>
            </label>
            <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-green-600 bg-green-900/10' : 'border-white/10 hover:border-yellow-700/50 bg-white/5'}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="text-center">
                  <div className="text-green-400 text-sm font-medium">{file.name}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-zinc-400 text-sm">📎 Click to upload screenshot</div>
                  <div className="text-zinc-600 text-xs mt-0.5">JPG, PNG or WebP · max 5MB</div>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all"
          >
            {uploading ? 'Uploading screenshot…' : submitting ? 'Submitting…' : alreadySubmitted ? 'Update Payment Details' : 'Submit Payment for Verification'}
          </button>
        </form>
      )}
    </div>
  )
}
