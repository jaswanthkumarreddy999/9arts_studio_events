'use client'

import { useState, useReducer } from 'react'
import { SEAT_TIERS, type SeatTier } from '@/lib/types'

interface FormData {
  full_name: string
  mobile: string
  email: string
  age: string
  address: string
  seat_tier: SeatTier
}

type Step = 'details' | 'payment' | 'success'

interface State {
  step: Step
  form: FormData
  errors: Partial<Record<keyof FormData, string>>
  applicationId: string
  amount: number
  uploading: boolean
  screenshotFile: File | null
  utrNumber: string
  submitting: boolean
  paymentConfirmed: boolean
  submitError: string
}

type Action =
  | { type: 'SET_FIELD'; field: keyof FormData; value: string }
  | { type: 'SET_ERRORS'; errors: Partial<Record<keyof FormData, string>> }
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_APP_ID'; applicationId: string; amount: number }
  | { type: 'SET_UPLOADING'; value: boolean }
  | { type: 'SET_SCREENSHOT'; file: File | null }
  | { type: 'SET_UTR'; value: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_PAYMENT_CONFIRMED' }
  | { type: 'SET_SUBMIT_ERROR'; error: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, form: { ...state.form, [action.field]: action.value }, errors: { ...state.errors, [action.field]: undefined } }
    case 'SET_ERRORS':
      return { ...state, errors: action.errors }
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_APP_ID':
      return { ...state, applicationId: action.applicationId, amount: action.amount, step: 'payment' }
    case 'SET_UPLOADING':
      return { ...state, uploading: action.value }
    case 'SET_SCREENSHOT':
      return { ...state, screenshotFile: action.file }
    case 'SET_UTR':
      return { ...state, utrNumber: action.value }
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.value }
    case 'SET_PAYMENT_CONFIRMED':
      return { ...state, paymentConfirmed: true, step: 'success' }
    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.error, submitting: false }
    default:
      return state
  }
}

const initialState: State = {
  step: 'details',
  form: { full_name: '', mobile: '', email: '', age: '', address: '', seat_tier: 'gold' },
  errors: {},
  applicationId: '',
  amount: 0,
  uploading: false,
  screenshotFile: null,
  utrNumber: '',
  submitting: false,
  paymentConfirmed: false,
  submitError: '',
}

function validate(form: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {}
  if (!form.full_name.trim() || form.full_name.trim().length < 2) errors.full_name = 'Enter your full name (min 2 chars)'
  if (!/^[6-9]\d{9}$/.test(form.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email'
  const age = Number(form.age)
  if (!form.age || isNaN(age) || age < 18 || age > 60) errors.age = 'Age must be between 18 and 60'
  if (!form.address.trim() || form.address.trim().length < 10) errors.address = 'Enter your full address'
  return errors
}

export default function RegistrationForm() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID ?? 'missnellore2026@upi'

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate(state.form)
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors })
      return
    }
    dispatch({ type: 'SET_SUBMITTING', value: true })
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state.form, age: Number(state.form.age) }),
      })
      const data = await res.json()
      if (!res.ok) {
        dispatch({ type: 'SET_SUBMIT_ERROR', error: data.error ?? 'Registration failed' })
        return
      }
      dispatch({ type: 'SET_APP_ID', applicationId: data.application_id, amount: data.amount })
    } catch {
      dispatch({ type: 'SET_SUBMIT_ERROR', error: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false })
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!state.utrNumber.trim()) {
      dispatch({ type: 'SET_SUBMIT_ERROR', error: 'Please enter your UTR / Transaction ID' })
      return
    }
    dispatch({ type: 'SET_SUBMITTING', value: true })
    dispatch({ type: 'SET_SUBMIT_ERROR', error: '' })

    try {
      let screenshotPath = ''

      if (state.screenshotFile) {
        // Get presigned URL
        const urlRes = await fetch('/api/payment/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: state.applicationId }),
        })
        const urlData = await urlRes.json()
        if (!urlRes.ok) throw new Error(urlData.error ?? 'Upload URL failed')

        // Upload file directly
        dispatch({ type: 'SET_UPLOADING', value: true })
        await fetch(urlData.signedUrl, {
          method: 'PUT',
          body: state.screenshotFile,
          headers: { 'Content-Type': state.screenshotFile.type },
        })
        dispatch({ type: 'SET_UPLOADING', value: false })
        screenshotPath = urlData.path
      }

      // Confirm payment
      const confirmRes = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: state.applicationId,
          utrNumber: state.utrNumber,
          screenshotPath,
        }),
      })
      if (!confirmRes.ok) {
        const d = await confirmRes.json()
        throw new Error(d.error ?? 'Failed to submit payment')
      }
      dispatch({ type: 'SET_PAYMENT_CONFIRMED' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment submission failed'
      dispatch({ type: 'SET_SUBMIT_ERROR', error: msg })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false })
      dispatch({ type: 'SET_UPLOADING', value: false })
    }
  }

  const tier = SEAT_TIERS[state.form.seat_tier]

  if (state.step === 'success') {
    return <SuccessScreen applicationId={state.applicationId} name={state.form.full_name} tier={state.form.seat_tier} />
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {(['details', 'payment'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${state.step === s || (s === 'details' && state.step === 'payment') ? 'bg-yellow-500 text-black' : 'bg-white/10 text-zinc-500'}`}>
              {i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${state.step === s ? 'text-yellow-400' : 'text-zinc-500'}`}>
              {s === 'details' ? 'Your Details' : 'Payment'}
            </span>
            {i < 1 && <div className={`w-12 h-px ${state.step === 'payment' ? 'bg-yellow-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      {state.step === 'details' && (
        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          {/* Seat tier selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Select Your Pass</label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(SEAT_TIERS) as [SeatTier, typeof SEAT_TIERS[SeatTier]][]).map(([key, t]) => {
                const discount = Math.round((1 - t.price / t.originalPrice) * 100)
                return (
                <label
                  key={key}
                  className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all ${state.form.seat_tier === key ? 'border-yellow-500 bg-yellow-900/20' : 'border-white/10 bg-white/5 hover:border-yellow-700/50'}`}
                >
                  <input type="radio" name="seat_tier" value={key} checked={state.form.seat_tier === key} onChange={() => dispatch({ type: 'SET_FIELD', field: 'seat_tier', value: key })} className="sr-only" />

                  {/* Discount badge */}
                  <div className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                    {discount}% OFF
                  </div>

                  <div className="text-2xl mb-2">{t.badge}</div>
                  <div className="font-bold text-white text-sm">{t.label}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</div>

                  {/* Price with strikethrough */}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-yellow-400 font-bold text-lg">₹{t.price}</span>
                    <span className="text-zinc-500 text-xs line-through">₹{t.originalPrice}</span>
                  </div>

                  <div className="text-xs text-zinc-500 mt-1">{t.description}</div>

                  {/* Seats left */}
                  <div className="text-xs text-zinc-600 mt-1.5 flex items-center gap-1">
                    <span>🎟️</span> {t.totalSeats} seats only
                  </div>

                  {state.form.seat_tier === key && (
                    <div className="absolute top-2 left-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    </div>
                  )}
                </label>
                )
              })}
            </div>
          </div>

          {/* Fields */}
          <Field label="Full Name *" error={state.errors.full_name}>
            <input type="text" value={state.form.full_name} onChange={e => dispatch({ type: 'SET_FIELD', field: 'full_name', value: e.target.value })} placeholder="Enter your full name" className={inputClass(!!state.errors.full_name)} />
          </Field>
          <Field label="Mobile Number *" error={state.errors.mobile}>
            <input type="tel" value={state.form.mobile} onChange={e => dispatch({ type: 'SET_FIELD', field: 'mobile', value: e.target.value })} placeholder="10-digit mobile number" maxLength={10} inputMode="numeric" className={inputClass(!!state.errors.mobile)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age *" error={state.errors.age}>
              <input type="number" value={state.form.age} onChange={e => dispatch({ type: 'SET_FIELD', field: 'age', value: e.target.value })} placeholder="Your age" min={18} max={60} className={inputClass(!!state.errors.age)} />
            </Field>
            <Field label="Email (optional)" error={state.errors.email}>
              <input type="email" value={state.form.email} onChange={e => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })} placeholder="your@email.com" className={inputClass(!!state.errors.email)} />
            </Field>
          </div>
          <Field label="Full Address *" error={state.errors.address}>
            <textarea value={state.form.address} onChange={e => dispatch({ type: 'SET_FIELD', field: 'address', value: e.target.value })} placeholder="Door no, street, area, city" rows={3} className={inputClass(!!state.errors.address) + ' resize-none'} />
          </Field>

          {state.submitError && (
            <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">
              {state.submitError}
            </div>
          )}

          <button type="submit" disabled={state.submitting} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-60 disabled:cursor-not-allowed hover:from-yellow-500 hover:to-yellow-300 transition-all hover:scale-[1.01] active:scale-[0.99]">
            {state.submitting ? 'Registering...' : `Continue to Payment →`}
          </button>
        </form>
      )}

      {state.step === 'payment' && (
        <PaymentStep
          applicationId={state.applicationId}
          amount={state.amount}
          tier={state.form.seat_tier}
          upiId={UPI_ID}
          utrNumber={state.utrNumber}
          screenshotFile={state.screenshotFile}
          uploading={state.uploading}
          submitting={state.submitting}
          submitError={state.submitError}
          onUtrChange={v => dispatch({ type: 'SET_UTR', value: v })}
          onFileChange={f => dispatch({ type: 'SET_SCREENSHOT', file: f })}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full bg-white/5 border ${hasError ? 'border-red-500' : 'border-white/10'} text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors`
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function PaymentStep({ applicationId, amount, tier, upiId, utrNumber, screenshotFile, uploading, submitting, submitError, onUtrChange, onFileChange, onSubmit }: {
  applicationId: string; amount: number; tier: SeatTier; upiId: string; utrNumber: string
  screenshotFile: File | null; uploading: boolean; submitting: boolean; submitError: string
  onUtrChange: (v: string) => void; onFileChange: (f: File | null) => void; onSubmit: (e: React.FormEvent) => void
}) {
  const t = SEAT_TIERS[tier]
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Application ID display */}
      <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
        <div className="text-green-400 text-xs uppercase tracking-wide font-semibold mb-1">Registration Successful!</div>
        <div className="text-white font-bold text-lg">{applicationId}</div>
        <div className="text-zinc-400 text-xs mt-1">⚠️ Save your Application ID — you need it to log in later</div>
      </div>

      {/* Payment details */}
      <div className="bg-white/5 border border-yellow-900/30 rounded-xl p-6">
        <h3 className="text-yellow-400 font-semibold mb-4">Complete Your Payment</h3>
        <div className="flex items-center justify-between mb-4">
          <span className="text-zinc-400">Pass</span>
          <span className="text-white font-medium">{t.badge} {t.label}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400">Original Price</span>
          <span className="text-zinc-500 line-through text-sm">₹{t.originalPrice}</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-zinc-400">Discount</span>
          <span className="text-green-400 text-sm font-medium">- ₹{t.originalPrice - t.price} saved 🎉</span>
        </div>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <span className="text-zinc-400">Amount to Pay</span>
          <span className="text-yellow-400 font-bold text-xl">₹{amount}</span>
        </div>

        {/* UPI details */}
        <div className="text-center mb-4">
          <div className="text-sm text-zinc-400 mb-2">Pay via any UPI app</div>
          <div className="inline-flex items-center gap-2 bg-black/40 border border-yellow-700/30 rounded-lg px-4 py-2">
            <span className="text-yellow-400 font-mono font-bold">{upiId}</span>
            <button type="button" onClick={() => navigator.clipboard.writeText(upiId)} className="text-zinc-500 hover:text-yellow-400 transition-colors text-xs">Copy</button>
          </div>
        </div>

        <div className="text-center text-sm text-zinc-500 flex items-center justify-center gap-2 flex-wrap">
          <span>📱 PhonePe</span><span>•</span><span>Google Pay</span><span>•</span><span>Paytm</span><span>•</span><span>Any UPI</span>
        </div>
      </div>

      {/* Upload */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Upload Payment Screenshot <span className="text-zinc-500">(optional but recommended)</span>
          </label>
          <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${screenshotFile ? 'border-green-600 bg-green-900/10' : 'border-white/10 hover:border-yellow-700/50 bg-white/5'}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => onFileChange(e.target.files?.[0] ?? null)} />
            {screenshotFile ? (
              <div className="text-center">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-green-400 text-sm font-medium">{screenshotFile.name}</div>
                <div className="text-zinc-500 text-xs mt-0.5">{(screenshotFile.size / 1024 / 1024).toFixed(1)} MB</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl mb-1">📎</div>
                <div className="text-zinc-400 text-sm">Click to upload screenshot</div>
                <div className="text-zinc-600 text-xs mt-0.5">JPG or PNG, max 5MB</div>
              </div>
            )}
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">UTR / Transaction ID *</label>
          <input type="text" value={utrNumber} onChange={e => onUtrChange(e.target.value)} placeholder="Enter UTR number from your UPI app" className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors" />
          <p className="text-zinc-600 text-xs mt-1">Find this in your UPI payment history / transaction details</p>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">{submitError}</div>
      )}

      <button type="submit" disabled={submitting || uploading} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-60 disabled:cursor-not-allowed hover:from-yellow-500 hover:to-yellow-300 transition-all">
        {uploading ? 'Uploading screenshot...' : submitting ? 'Submitting...' : 'Submit Payment for Verification'}
      </button>
      <p className="text-zinc-600 text-xs text-center">Payment will be manually verified within 24 hours. You will get your QR pass after verification.</p>
    </form>
  )
}

function SuccessScreen({ applicationId, name, tier }: { applicationId: string; name: string; tier: SeatTier }) {
  const t = SEAT_TIERS[tier]
  return (
    <div className="text-center max-w-md mx-auto">
      <div className="text-6xl mb-6 float">🎉</div>
      <h3 className="text-2xl font-bold text-white mb-2">You&apos;re Registered!</h3>
      <p className="text-zinc-400 mb-6">Thank you, <span className="text-white font-medium">{name}</span>. Your payment is under review.</p>

      <div className="bg-white/5 border border-yellow-900/30 rounded-2xl p-6 mb-6 text-left">
        <div className="text-yellow-400 text-xs uppercase tracking-widest font-semibold mb-4">Your Registration Details</div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-zinc-400 text-sm">Application ID</span>
            <span className="text-white font-mono font-bold text-sm">{applicationId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 text-sm">Pass Type</span>
            <span className="text-white text-sm">{t.badge} {t.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 text-sm">Status</span>
            <span className="text-yellow-400 text-sm font-medium">Payment Pending Verification</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 mb-6 text-left">
        <div className="text-amber-400 text-sm font-semibold mb-1">⚠️ Save Your Application ID</div>
        <div className="text-zinc-400 text-sm">You need this to log in and get your QR pass after verification: <span className="text-white font-mono">{applicationId}</span></div>
      </div>

      <a href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-8 py-3 rounded-full hover:from-yellow-500 hover:to-yellow-300 transition-all">
        Check My Pass Status →
      </a>
    </div>
  )
}
